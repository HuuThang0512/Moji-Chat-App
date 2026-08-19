/**
 * Smoke test toan bo REST API tren mot server dang chay.
 * Chay: npm run smoke        (mac dinh http://localhost:5001/api)
 *       SMOKE_BASE_URL=http://localhost:5099/api npm run smoke
 * Test tao user that trong database dang duoc tro toi, nen chi chay tren DB dev.
 */
const BASE = process.env.SMOKE_BASE_URL || "http://localhost:5001/api";
const stamp = Date.now().toString(36);

let passed = 0, failed = 0;
const check = (name, cond, extra = "") => {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name} ${extra}`); }
};

class Client {
  constructor(tag) { this.tag = tag; this.cookie = ""; this.token = null; }
  async req(method, path, body, opts = {}) {
    const headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (this.token && !opts.noAuth) headers.Authorization = `Bearer ${this.token}`;
    if (this.cookie) headers.Cookie = this.cookie;
    const res = await fetch(BASE + path, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    });
    const setCookie = res.headers.getSetCookie?.() ?? [];
    for (const c of setCookie) {
      const pair = c.split(";")[0];
      if (pair.startsWith("refreshToken=")) this.cookie = pair;
    }
    let data = null;
    const text = await res.text();
    if (text) { try { data = JSON.parse(text); } catch { data = text; } }
    return { status: res.status, data };
  }
}

const users = {};
async function makeUser(tag) {
  const c = new Client(tag);
  const username = `${tag}_${stamp}`;
  const up = await c.req("POST", "/auth/signup", {
    username, password: "secret123", email: `${username}@example.com`,
    firstName: tag.toUpperCase(), lastName: "Tester",
  });
  check(`signup ${tag} -> 204`, up.status === 204, JSON.stringify(up.data));
  const si = await c.req("POST", "/auth/signin", { username, password: "secret123" });
  check(`signin ${tag} -> 200 + token`, si.status === 200 && !!si.data?.accessToken, JSON.stringify(si.data));
  c.token = si.data?.accessToken;
  c.id = si.data?.user?._id;
  c.username = username;
  users[tag] = c;
  return c;
}

console.log("\n== Auth ==");
const alice = await makeUser("alice");
const bob = await makeUser("bob");
const mallory = await makeUser("mallory");

{
  const dup = await alice.req("POST", "/auth/signup", {
    username: alice.username, password: "secret123",
    email: `other_${stamp}@example.com`, firstName: "A", lastName: "B",
  });
  check("signup trung username -> 409", dup.status === 409, JSON.stringify(dup.data));

  const bad = await alice.req("POST", "/auth/signup", {
    username: `x_${stamp}`, password: "123", email: "not-an-email", firstName: "", lastName: "B",
  });
  check("signup du lieu sai -> 400 kem danh sach field",
    bad.status === 400 && Array.isArray(bad.data?.errors) && bad.data.errors.length >= 3,
    JSON.stringify(bad.data));

  const wrong = await alice.req("POST", "/auth/signin", { username: alice.username, password: "wrongpass" });
  check("signin sai mat khau -> 401", wrong.status === 401, JSON.stringify(wrong.data));

  const noTok = await new Client("anon").req("GET", "/users/me");
  check("thieu token -> 401 (truoc day tra 403)", noTok.status === 401, JSON.stringify(noTok.data));

  const me = await alice.req("GET", "/users/me");
  check("GET /users/me -> 200", me.status === 200 && me.data?.user?.username === alice.username);

  const ref = await alice.req("POST", "/auth/refresh");
  check("refresh bang cookie -> accessToken moi", ref.status === 200 && !!ref.data?.accessToken, JSON.stringify(ref.data));

  const noCookie = await new Client("anon").req("POST", "/auth/refresh");
  check("refresh khong cookie -> 401", noCookie.status === 401);
}

console.log("\n== Friends ==");
{
  const search = await alice.req("GET", `/users/search?username=${bob.username}`);
  check("tim user -> relationship none", search.status === 200 && search.data?.user?.relationship === "none", JSON.stringify(search.data));

  const badId = await alice.req("POST", "/friends/requests", { to: "khong-phai-objectid" });
  check("gui loi moi voi id sai -> 400", badId.status === 400, JSON.stringify(badId.data));

  const selfReq = await alice.req("POST", "/friends/requests", { to: alice.id });
  check("tu ket ban -> 400", selfReq.status === 400, JSON.stringify(selfReq.data));

  const sent = await alice.req("POST", "/friends/requests", { to: bob.id, message: "hi" });
  check("alice gui loi moi cho bob -> 201", sent.status === 201, JSON.stringify(sent.data));
  const reqId = sent.data?.friendRequest?._id;

  const again = await alice.req("POST", "/friends/requests", { to: bob.id });
  check("gui lai loi moi -> 400", again.status === 400, JSON.stringify(again.data));

  const stealing = await mallory.req("POST", `/friends/requests/${reqId}/accept`);
  check("nguoi ngoai chap nhan ho -> 403", stealing.status === 403, JSON.stringify(stealing.data));

  const list = await bob.req("GET", "/friends/requests");
  check("bob thay 1 loi moi den", list.status === 200 && list.data?.receivedRequests?.length === 1);

  const acc = await bob.req("POST", `/friends/requests/${reqId}/accept`);
  check("bob chap nhan -> 200", acc.status === 200, JSON.stringify(acc.data));

  const friends = await alice.req("GET", "/friends");
  check("alice co bob trong danh sach ban",
    friends.data?.friends?.some((f) => f._id === bob.id), JSON.stringify(friends.data));

  const search2 = await alice.req("GET", `/users/search?username=${bob.username}`);
  check("tim lai -> relationship friends", search2.data?.user?.relationship === "friends");
}

console.log("\n== Conversations & Messages ==");
let convoId;
{
  const notFriend = await alice.req("POST", "/conversations", { type: "direct", memberIds: [mallory.id] });
  check("mo chat voi nguoi la -> 403", notFriend.status === 403, JSON.stringify(notFriend.data));

  const created = await alice.req("POST", "/conversations", { type: "direct", memberIds: [bob.id] });
  check("tao chat direct -> 201", created.status === 201, JSON.stringify(created.data));
  convoId = created.data?.conversation?._id;
  check("participants da duoc lam phang kem displayName",
    created.data?.conversation?.participants?.every((p) => p._id && p.displayName),
    JSON.stringify(created.data?.conversation?.participants));

  const again = await alice.req("POST", "/conversations", { type: "direct", memberIds: [bob.id] });
  check("tao lai chat direct tra ve dung conversation cu", again.data?.conversation?._id === convoId);

  const empty = await alice.req("POST", "/messages/direct", { recipientId: bob.id, content: "   ", conversationId: convoId });
  check("gui tin nhan rong -> 400", empty.status === 400, JSON.stringify(empty.data));

  const sentMsg = await alice.req("POST", "/messages/direct", { recipientId: bob.id, content: "chao bob", conversationId: convoId });
  check("alice gui tin nhan -> 201", sentMsg.status === 201, JSON.stringify(sentMsg.data));

  // LO HONG DA VA: mallory khong thuoc conversation
  const intrude = await mallory.req("POST", "/messages/direct", { recipientId: bob.id, content: "xin chao", conversationId: convoId });
  check("nguoi ngoai ghi vao conversation -> 403 (lo hong da va)", intrude.status === 403, JSON.stringify(intrude.data));

  const peek = await mallory.req("GET", `/conversations/${convoId}/messages`);
  check("nguoi ngoai doc tin nhan -> 403 (lo hong da va)", peek.status === 403, JSON.stringify(peek.data));

  const peekSeen = await mallory.req("PATCH", `/conversations/${convoId}/seen`);
  check("nguoi ngoai danh dau da doc -> 403", peekSeen.status === 403, JSON.stringify(peekSeen.data));

  const msgs = await bob.req("GET", `/conversations/${convoId}/messages`);
  check("bob doc duoc tin nhan", msgs.status === 200 && msgs.data?.messages?.length === 1, JSON.stringify(msgs.data));

  const cursorEmpty = await bob.req("GET", `/conversations/${convoId}/messages?limit=50&cursor=`);
  check("cursor rong van hop le -> 200", cursorEmpty.status === 200, JSON.stringify(cursorEmpty.data));

  const badLimit = await bob.req("GET", `/conversations/${convoId}/messages?limit=99999`);
  check("limit vuot nguong -> 400", badLimit.status === 400, JSON.stringify(badLimit.data));

  const convos = await bob.req("GET", "/conversations");
  const c = convos.data?.conversations?.find((x) => x._id === convoId);
  check("bob thay unreadCount = 1", c?.unreadCount?.[bob.id] === 1, JSON.stringify(c?.unreadCount));

  const seen = await bob.req("PATCH", `/conversations/${convoId}/seen`);
  check("bob danh dau da doc -> 200, unread ve 0", seen.status === 200 && seen.data?.myUnreadCount === 0, JSON.stringify(seen.data));

  const convos2 = await bob.req("GET", "/conversations");
  const c2 = convos2.data?.conversations?.find((x) => x._id === convoId);
  check("unreadCount da reset", (c2?.unreadCount?.[bob.id] ?? 0) === 0 && c2?.seenBy?.length === 1, JSON.stringify(c2?.unreadCount));
}

console.log("\n== Groups ==");
{
  const carol = await makeUser("carol");
  await alice.req("POST", "/friends/requests", { to: carol.id });
  const reqs = await carol.req("GET", "/friends/requests");
  await carol.req("POST", `/friends/requests/${reqs.data.receivedRequests[0]._id}/accept`);

  const tooFew = await alice.req("POST", "/conversations", { type: "group", name: "Nhom", memberIds: [bob.id] });
  check("nhom duoi 2 thanh vien -> 400", tooFew.status === 400, JSON.stringify(tooFew.data));

  const noName = await alice.req("POST", "/conversations", { type: "group", memberIds: [bob.id, carol.id] });
  check("nhom thieu ten -> 400", noName.status === 400, JSON.stringify(noName.data));

  const group = await alice.req("POST", "/conversations", { type: "group", name: "Nhom test", memberIds: [bob.id, carol.id] });
  check("tao nhom -> 201 voi 3 thanh vien",
    group.status === 201 && group.data?.conversation?.participants?.length === 3,
    JSON.stringify(group.data?.conversation?.participants?.length));
  const gid = group.data?.conversation?._id;

  const gmsg = await bob.req("POST", "/messages/group", { conversationId: gid, content: "chao ca nhom" });
  check("thanh vien gui tin nhom -> 201", gmsg.status === 201, JSON.stringify(gmsg.data));

  const intruder = await mallory.req("POST", "/messages/group", { conversationId: gid, content: "hack" });
  check("nguoi ngoai gui tin nhom -> 403", intruder.status === 403, JSON.stringify(intruder.data));

  const wrongType = await bob.req("POST", "/messages/group", { conversationId: convoId, content: "sai loai" });
  check("gui tin nhom vao chat direct -> 403", wrongType.status === 403, JSON.stringify(wrongType.data));
}

console.log("\n== Misc ==");
{
  const nf = await alice.req("GET", "/khong-ton-tai");
  check("route khong ton tai -> 404 JSON", nf.status === 404 && typeof nf.data?.message === "string", JSON.stringify(nf.data));

  const out = await alice.req("POST", "/auth/signout");
  check("signout -> 204", out.status === 204);
}

console.log(`\n=== ${passed} pass / ${failed} fail ===`);
process.exit(failed ? 1 : 0);
