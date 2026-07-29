# HydCraft Portal Memory

## Partner Drafts

- 在伙伴/支持鸣谢创建流程中，允许“先落一条真实记录，再上传媒体”。
- 这是刻意保留的行为，不要擅自改回“必须先完整保存再上传”。
- 但后续必须补自动清理机制，避免留下悬空或半成品伙伴记录。

## Attachment URL Policy

- 附件公开 URL 不要在业务代码里手写 `baseUrl + objectKey`。
- 统一通过 `server/utils/attachment/runtime.ts` 提供的公开 URL 方法生成。
- 如果以后要切换 COS / S3 兼容实现，优先改存储抽象层，不要在业务模块里分叉协议。

## UI Change Discipline

- 不要在未明确要求时额外添加 hover 浮动、缩放、过强动效或重排版交互。
- 对现有样式做修改时，优先基于用户已改过的版本继续迭代，不要擅自回退视觉方向。

## Build And Error Rules

- 默认优先执行与改动范围对应的局部验证，例如 `pnpm lint`、目标文件格式检查、i18n JSON 解析和相关引用扫描；小范围 UI 或文案修改不要每次都强制执行全量 Build。
- 如确实需要执行全项目 Build，Timeout 设定控制在 260s - 300s 左右；当前项目在本机执行全量 Build 大约需要 4 - 5 分钟，超过 300s 时应明确标记为未完成，不要把超时当成 Build 通过。
- 因为 Build 时间较长，小范围改动优先局部 build。全局 Build 容易消耗时间。
- 错误码与错误标识命名，优先使用英语、大写、下划线风格，例如 `RESOURCE_NOT_FOUND`、`UPLOAD_FAILED`。
- 面向用户的错误展示与文案，统一走 i18n，不要在业务流程中散落硬编码错误文案。
- 新增功能或调整现有逻辑时，默认需要考虑 i18n 接入，而不是仅处理单语言场景。

## Archive Scanner Workflow

- archive 存档扫描项目固定为 `~/code/hydcraft-archive-scanner`，负责只读读取外部世界目录并产出 artifact JSON。
- 扫描外部 Windows 存档时，默认走 WSL 路径，例如 `/mnt/f/Games/Minecraft/Saves/...`；只允许只读检查，不要直接改外部存档内容。
- 标准顺序是：先在 scanner 项目执行 `pnpm build` 与 `pnpm scan ...`，再回到 portal 执行 `pnpm archive:import --server <serverId> --artifact <path>`。
- 若 archive 数据异常，先区分是 scanner 事实提取问题、portal 导入归属问题、还是 portal 展示统计口径问题；不要一上来把症状都归到 scanner。

## UI Implementation Preference

- HTML 结构中，非必要不要直接写 `style` 内联样式，优先使用 Tailwind CSS 与 Nuxt UI 提供的能力完成样式表达。
- `<style scoped>` 不是禁用，但应只用于 Tailwind CSS / Nuxt UI 难以表达的复杂状态、动画、第三方组件覆盖或结构性样式；普通布局与视觉优先留在模板 class。
- `:style` / 内联 `style` 只用于运行时计算值、第三方库注入 HTML、canvas / map 等 Tailwind CSS 无法静态表达的场景；静态样式不要回退成 inline style。

## Attachment Storage Boundary

- 当前附件存储实现虽然基于 COS，但约束应按 S3-compatible / object storage 抽象理解，不要把业务规则绑定在某一家厂商 SDK 上。
- 不要在业务模块里直接 new COS、手写 SDK 参数、或自行拼接对象存储公开地址。
- 附件上传、删除、公开 URL、bucket profile 选择，统一走 `server/utils/attachment` 抽象层，不要绕过 runtime / service / storage-adapter。
- 如果未来切换到 S3 兼容实现，优先改 `storage-adapter` 与 runtime profile 映射，不要改业务 service / API handler。
- `publicAssets` 与 `privateUploads` 的 bucket / profile 语义不可在业务代码里混用；是否公开由 profile 与 visibility 决定，不靠调用方临时约定。
- 业务层只消费 `objectKey`、attachment id、public URL 结果，不关心底层厂商字段命名。

## UI System Discipline

- 优先复用 `app.config.ts` 中的 Nuxt UI 主题配置，以及 `assets/styles/base/tailwind.css` 中的 design token，不要在页面里重新发明一套颜色、表面层级、尺寸语义。
- 颜色、语义色、表面层级、字号与字体倾向，优先通过 token 与 class 表达，不要在局部组件里散落硬编码色值。
- 对 Nuxt UI 组件的定制，优先走 theme / config / class 扩展，不要为了一个局部视觉点把整个组件手写替换掉。
- 基础信息卡片默认优先使用 `rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950` 这套配色与圆角；只有在语义或视觉方向明确不同的时候再局部调整。

## Utils Directory Discipline

- `utils/` 不要长期平铺堆放领域文件；只允许保留极少数真正的顶层稳定入口，默认都应按领域拆进子文件夹，例如 `utils/profile/*`、`utils/community/*`、`utils/links/*`。
- 当某个 util 已明显服务于特定业务域、页面族、或模块契约时，优先新建对应子目录，不要继续把文件散放在 `utils/` 根下。
- 做 utils 重构时，先按领域边界整理目录，再决定是否保留或收缩顶层 re-export 入口；不要为了“先能用”长期保留一堆平铺 shim。

## Error And i18n Discipline

- 服务端业务错误统一通过 `createApiError` / `createBadRequestError` 抛出，不要直接散落 `createError` 拼结构。
- 错误 code 保持英语、大写、下划线风格；HTTP status 与错误 code 分离，前端展示依赖 i18n 映射，不直接展示裸文案。
- 新增错误 code 时，默认同步补各 locale 的 `errors` 文案；至少不能只补一个语言后就结束。
- 面向用户的失败提示统一走 i18n；日志与内部诊断信息可以保留英文技术描述。
- `console.error` / `console.warn` 的标签前缀优先使用稳定的英文大写错误标识，方便检索，例如 `PROFILE_ATTACHMENT_CLEANUP_FAILED`。
- 当前项目可将 i18n 视为“全局可用”，模板层优先复用全局能力，不要在能直接使用全局能力的地方重复包一层相同语义的实现。
- 但要区分边界：模板可直接使用全局注入能力；`script setup` / 组合式逻辑内若需要响应式 locale 与类型安全，仍应优先使用 `useI18n()` 或现有封装，而不是误以为模板侧全局能力可无差别替代脚本侧调用。
- 任何对 `locales/` 下文案的修改，都必须同步检查并补齐对应语言文件，不能只改单一语言后结束；新增 key、改 key、删 key 时都按“所有已支持 locale 一起收口”处理。
- 任何新增面向用户的文案、错误提示、状态文案或内容标题时，默认同时补齐对应 i18n 文本，不允许留下仅单语言可见的中间态。

## Event And Side-Effect Boundary

- Service 负责核心数据库操作与数据合法性校验，成功后发事件；异步清理、发信、联动修复等副作用放到 event handler / plugin 层。
- API handler 保持薄层：鉴权、读参、调用 service、返回结果，不在 handler 里堆业务细节。
- 新增业务节点时，先想清楚是否应该补事件，而不是让两个业务模块直接互相调用。
- 定时清理、附件替换清理、OAuth 解绑后的补偿动作，这类后处理逻辑优先挂到 plugin / event 层，而不是塞回主流程事务里。
- 若某个副作用失败，优先记录日志并可重试，不要轻易污染核心成功路径。

## Draft And Cleanup Lifecycle

- 允许存在草稿、待上传、待替换、待清理这类中间态，但必须同时设计对应的过期回收或替换清理机制。
- 新增“先落库后补媒体”或“先生成记录再补关联”的流程时，要同时考虑悬空记录、过期附件、孤儿资源的清理策略。
- 如果一个功能会生成临时 token、临时附件、临时申请单、临时注册记录，默认需要先回答：谁来清、何时清、失败后如何补偿。

## Content And Frontmatter Discipline

- 修改 `content/` 下任意多语言内容时，必须把同一份内容视为一个整体：若一个语言版本已修改，需同步检查其它语言版本是否需要跟进，不能长期放任跨语言内容漂移。
- 当用户说“把 `zh-CN` 的加改内容同步到另外两个语言文件”“1:1 贴到另外两个语言文件去”这类话时，默认含义是：以本次 `zh-CN` 的增量 diff 为准，把对应新增/改写内容翻译并补到其它语言文件的对应位置；不是把整份 `zh-CN` 文件覆盖到其它语言文件。
- 处理多语言 content 同步时，优先先看本次源语言文件的 `git diff`，只传播“本次改动的语义增量”，不要把“当前整份文件内容”误当成同步模板，除非用户明确要求“整份覆盖”或“全文重置为同一语言内容”。
- 如果用户使用的是碎片化短句或命令式表述，尤其是 content/i18n 同步类需求，要把它当作快捷命令解析：先按项目既有语境收窄到最小安全操作，再执行；不要擅自扩大成整文件替换、批量重写或跨语言全文覆盖。
- 若某份 Markdown 在文件头（frontmatter）中包含 `updatedAt` 等描述性时间字段，则每次修改该份内容时，都要把该时间更新为当前修改时间（精确到分秒时）。
- 更新 `updatedAt` 时，必须由 agent 在修改前或修改时自行获取当前时间并直接写入，时间精确到秒；不要沿用旧时间、猜测时间、手动心算时间，也不要等用户提供时间。
- 同一份 content 的多语言版本应共用同一个 `updatedAt` 时间语义；如果只改了其中一个语言版本，也要把该 content 其它语言文件头中的对应时间一并同步到同一个当前时间。
- 对 content 的结构性信息（如 frontmatter 中的标题、描述、时间、额外元数据）做调整时，默认同步检查同名多语言文件，确保元信息结构保持一致。
- MD 内调用的组件如果内有 Caption 等描述信息，也要一同翻译；MD 内调用的组件如果就写在一行内，直接搬过去，不要私自换行，这样会被当成 Markdown 文本解析而非组件调用。
- MD / MDC 的 `::component{...}` 单行调用里，如果某个参数本身用单引号包裹整段 JSON 或长字符串，例如 `images='[...]'`，内部不要再出现原始 ASCII 单引号 `'`；英文里的所有格、缩写优先改写，或改成 Unicode 弯引号 `’`，因为这类问题会在 `JSON.parse` 之前先把 MDC 参数层打坏。
- 遇到 `::image-grid` / `::image-carousel` 这类单行 MDC 组件时，修改后要单独搜索一遍 `::` 调用并人工复查渲染敏感字符；英文图片 caption 是高风险区，不能只看正文 diff。
- Markdown / Content 里的 LaTeX 默认直接使用 `$$ ... $$` 块级写法；不要在这类内容文件里留下容易被 Markdown / MDC 解析歧义吞掉的临时数学写法。
