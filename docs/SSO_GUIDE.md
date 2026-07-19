# Hydroline OAuth 接入说明

Portal 为 HydCraft 子项目提供 OAuth 2.0 Authorization Code + PKCE 登录。Portal access token 是短期 opaque token：客户端不验证 JWT，而是携带 token 调用 Portal 的 `userinfo` 获取身份资料。

## 端点

- 授权入口：`{issuer}/oauth/authorize`
- 换取令牌：`{issuer}/api/oauth/token`
- 用户资料：`{issuer}/api/oauth/userinfo`

每个子项目必须在 Portal 后台创建 OAuth client。`Client ID` 可以公开；`Client Secret` 只在子项目服务端保存。

## 登录流程

子项目服务端生成并保存：

- `state`：防止授权回调 CSRF。
- `code_verifier`：PKCE 原始值。
- `code_challenge`：`BASE64URL(SHA256(code_verifier))`。

浏览器跳转：

```text
GET {issuer}/oauth/authorize
  ?response_type=code
  &client_id={client_id}
  &redirect_uri={redirect_uri}
  &scope=profile%20hydroline
  &state={state}
  &code_challenge={code_challenge}
  &code_challenge_method=S256
```

回调地址收到 `{redirect_uri}?code={code}&state={state}` 后，服务端必须先校验 `state`，再使用 client secret 和 PKCE verifier 换取 token。

```http
POST {issuer}/api/oauth/token
Authorization: Basic BASE64(client_id:client_secret)
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "{code}",
  "redirect_uri": "{redirect_uri}",
  "code_verifier": "{code_verifier}"
}
```

token endpoint 返回短期 `access_token`、`expires_in` 和实际 scope。子项目随后调用：

```http
GET {issuer}/api/oauth/userinfo
Authorization: Bearer {access_token}
```

Portal 根据 token 的数据库记录、过期时间、撤销状态和用户状态在线返回资料。`profile` 返回展示资料；`email` 返回邮箱；`hydroline` 返回 Hydroline ID、role、status、locale；`directory.read` 仅允许管理员目录查询。

## 会话边界

Portal Cookie 只属于 Portal。每个子项目从 userinfo 建立自己的短期本地 session，不能共享 Portal Cookie，也不能把 access token 当作长期业务凭据。
