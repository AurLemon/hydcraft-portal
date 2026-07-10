# SSO 登录接入说明

> 2026/7/10 23:48
>
> 这份文档是给 HydCraft 系项目接入 Portal 登录用的。Portal 的账户系统严格来说叫 Hydroline ID。
>
> Portal 在这里扮演的是身份提供方，也就是大家常说的 IdP。

注意：子项目不要共享 Portal 的 Cookie，也不要试图把 `.hydcraft.cn` 当成一个万能登录态。严禁这样做，这样会直接放大安全风险。

推荐做法是 OAuth 2.0 Authorization Code + PKCE，并按照 OIDC 的方式使用 `id_token` 完成登录。简单说，用户在子项目点击登录，浏览器跳到 Portal，Portal 确认用户是谁，再把授权码带回子项目。子项目用授权码去 Portal 后端换 token，验证 `id_token` 后建立自己的本地会话。

## 基本信息

常用端点如下：

- 授权入口：`{issuer}/oauth/authorize`
- 换取令牌：`{issuer}/api/oauth/token`
- 用户信息：`{issuer}/api/oauth/userinfo`
- 公钥列表：`{issuer}/.well-known/jwks.json`

子项目需要在 Portal 后台创建一个 OAuth 客户端。创建时会拿到 `Client ID` 和 `Client Secret`。`Client ID` 可以一直展示，`Client Secret` 只在创建成功时出现一次，后面不要再试图找回它。丢了就重建客户端，或者以后再做轮换机制。

如果缺少 Secret ID、Secret Key 等信息，请要求提供。

## 回调地址

回调地址必须提前登记，并且请求时传入的 `redirect_uri` 要和登记值完全一致。这里不是模糊匹配，也不是只比域名。路径、协议、端口都要对上。

生产环境建议只使用 HTTPS：

```text
https://hydcraft.cn/auth/callback
```

本地开发可以使用 loopback HTTP：

```text
http://localhost:3000/auth/callback
http://127.0.0.1:3000/auth/callback
```

非本地的 HTTP 回调不允许。这个限制不是为了折腾人，而是因为授权码会经过浏览器地址栏，如果传输层不可靠，后面所有校验都只是补救。

## 登录流程

子项目发起登录时，先生成这几个值：

- `state`：防 CSRF，用来确认回来的请求确实是自己发出去的。
- `nonce`：防 token replay，用来确认 `id_token` 属于这次登录。
- `code_verifier`：PKCE 原始值，服务端自己保存。
- `code_challenge`：`BASE64URL(SHA256(code_verifier))`。

然后把浏览器重定向到 Portal：

```text
GET {issuer}/oauth/authorize
  ?response_type=code
  &client_id={client_id}
  &redirect_uri={redirect_uri}
  &scope=openid%20profile
  &state={state}
  &nonce={nonce}
  &code_challenge={code_challenge}
  &code_challenge_method=S256
```

这里 `scope` 必须包含 `openid`。如果只是想让用户登录，`openid profile` 通常就够了。如果确实需要邮箱，再加 `email`。`hydroline` 用来读取 Hydroline ID，不要因为看起来很像自家字段就默认全要。权限开太大，后面排查问题会很烦。

如果用户还没登录 Portal，Portal 会先把他带到登录页。用户登录完成后，还是会回到这次 OAuth 授权流程。也就是说，子项目不需要自己实现 Portal 的登录 UI，更不应该在自己页面里收 Portal 密码。

## 回调处理

用户同意以后，Portal 会跳回子项目登记的回调地址：

```text
{redirect_uri}?code={code}&state={state}
```

子项目收到回调后，先检查 `state`。`state` 不对，直接拒绝，不要继续换 token。这个值的意义就是确认“这是我刚才发出去的登录请求”，不是装饰品。

然后由子项目后端请求 token endpoint：

```http
POST {issuer}/api/oauth/token
Content-Type: application/json
Authorization: Basic BASE64(client_id:client_secret)

{
  "grant_type": "authorization_code",
  "code": "{code}",
  "redirect_uri": "{redirect_uri}",
  "code_verifier": "{code_verifier}"
}
```

也可以用 body 传 `client_id` 和 `client_secret`，但服务端项目优先用 HTTP Basic，比较清楚。`Client Secret` 不应该出现在浏览器里。纯前端项目不适合直接持有 secret，如果以后真有这种场景，需要单独设计 public client，而不是硬塞当前 confidential client 流程。

Portal 会返回：

```json
{
	"access_token": "...",
	"token_type": "Bearer",
	"expires_in": 900,
	"scope": "openid profile",
	"id_token": "..."
}
```

## id_token 校验

子项目真正用来建立登录态的是 `id_token`。不要只因为 token endpoint 返回了 200 就直接登录用户，还是要把 JWT 校验做完。

至少检查这些字段：

- `iss` 必须等于 Portal 的 issuer。
- `aud` 必须等于自己的 `Client ID`。
- `exp` 必须还没过期。
- `nonce` 必须等于发起登录时保存的 nonce。
- 签名必须能用 Portal 的 JWKS 公钥验证通过。

`sub` 是 Portal 内部稳定用户 ID。子项目保存用户关联时，优先保存 `sub`。Hydroline ID 可以展示、可以作为业务识别信息，但不要把它当成永远不变的主键。展示名、头像、邮箱这些也都属于资料，不是身份主键。

如果需要用户资料，可以用 `access_token` 请求：

```http
GET {issuer}/api/oauth/userinfo
Authorization: Bearer {access_token}
```

返回内容会受 scope 影响。`profile` 会给公开资料，`email` 会给邮箱和验证状态，`hydroline` 会给 Hydroline ID。子项目只要自己需要的字段，不要把 userinfo 当成全量用户表同步。

## 子项目本地会话

完成 `id_token` 校验后，子项目应该建立自己的本地 session。这里很关键：Portal 的 Cookie 只属于 Portal，子项目的 Cookie 只属于子项目。用户在 Portal 已登录时，打开另一个子项目可以做到近似无感登录，但实现方式仍然是重新走一次 OIDC 重定向，而不是共享同一枚 Cookie。

所以，多站点登录状态大概是这样：

- Portal 已登录：子项目发起 OIDC 登录时，Portal 不需要用户再输入密码。
- 子项目 A 已登录：子项目 B 不会自动拿到 A 的 session。
- 子项目 B 想登录：它还是跳 Portal，但因为 Portal 已登录，所以流程会很短。
- Portal 登出：不会自动删除所有子项目的本地 session，除非后面额外做全局登出或 back-channel logout。

这个边界看起来麻烦，但它是干净的。每个系统负责自己的 session，Portal 负责证明“这个人是谁”。不要让身份系统顺手接管所有业务系统的会话生命周期，否则以后排查登录问题会非常痛苦。

## FAQ

- `redirect_uri` 必须完全一致。多一个斜杠、端口不一样、HTTP/HTTPS 不一样，都会失败。
- `state` 和 `nonce` 都要保存并校验。`state` 管回调来源，`nonce` 管 token 归属，两个不是一个东西。
- `code_verifier` 只能在服务端保存，换 token 时再拿出来。不要把它丢到 URL 里。
- `Client Secret` 不进浏览器，不进前端包，不进公开仓库。
- `sub` 才是稳定身份主键。Hydroline ID 更像用户可见的身份标识，不适合作为跨系统数据库主键。
- access token 短期有效。当前默认 `expires_in` 是 900 秒，不要拿它当长期登录凭据。
