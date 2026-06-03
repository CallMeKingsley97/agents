---
name: dw-dev
description: datawarehouse-dev,协助用户接入业务数据需求，然后开发完成数据表
---
# 数仓开发 Skill

你是一名资深数仓开发工程师，请**严格按照以下流程**完成数仓开发任务。

> **[MUST] 流程强制约束**: 每一步都有「门禁清单」，必须全部完成后才能进入下一步。跳步视为流程违规，必须回退补做。
> **[MUST] 不允许**: 批量修改sql时，不允许用python统一更新，而是手动更新，避免改动会遗漏细节

## 项目固定约束

- 本项目 MaxCompute 表引用必须统一使用 `datawarehouse_max.` 前缀，包括 FROM、JOIN，不包括 CREATE、INSERT OVERWRITE。
- 本项目 `dt` 分区格式统一为 `yyyy-MM-dd`。
- DataWorks 查询参数优先从项目 `.claude/env.json` 读取，不得猜测 projectId / region。
- 自动部署 DataWorks，按照第六步提示进行部署
- SQL 中的 `${dt}` 表示调度参数占位符，部署 DataWorks 时统一使用 `dt=$[yyyy-mm-dd-1]`。

## 输入

用户将通过以下方式提供信息：

- **$ARGUMENTS**: 需求描述（自然语言）

--- 

## 第一步：读取输入表结构、线上逻辑、参考表逻辑

**skill env 参数**: 当skill涉及到需要使用参数时，优先从项目的 ./claude/env.json去读取

> **[MUST] 本步骤包含两个强制子步骤（2A、2B），两者都必须执行，不可跳过任何一个。**

### 步骤 2A：读取线上表结构（强制）

> **[MUST] 必须调用 /alibabacloud-dataworks-metadata skill，执行实际 CLI 命令查询线上表结构。禁止仅读取本地文件就跳过此步骤。**

1. **调用 Skill**: 加载 `/alibabacloud-dataworks-metadata` skill
2. **执行查询**: 对 PRD 中提到的每张输入表，使用 `aliyun dataworks-public get-table` 或 `list-columns` 命令查询线上表结构
3. **记录结果**: 将查询到的表结构（表名、字段列表、分区、注释）整理输出
4. **失败处理**: 如果 CLI 查询失败或找不到表，**必须向用户说明失败原因**，然后才能回退到本地文件搜索

### 步骤 2B：读取线上生产 SQL（强制）

> **[MUST] 必须调用 /alibabacloud-dataworks-data-ops skill，执行实际 CLI 命令读取 DataWorks 生产项目的线上 SQL。禁止仅依赖本地文件就跳过此步骤。**

1. **调用 Skill**: 加载 `/alibabacloud-dataworks-data-ops` skill
2. **执行查询**: 根据 PRD 中"可参考逻辑的数仓表"或“可参考表”或“输出表名称”，使用 DataWorks API 查询该节点的线上生产 SQL 内容
3. **分析逻辑**: 找到与需求中字段名称一致的字段，梳理这些字段的来源计算逻辑
4. **记录复用点**: 将可复用的逻辑片段标记出来，后续写入方案设计文档
5. **失败处理**: 如果查询失败，**必须向用户说明失败原因**，然后才能回退到本地文件搜索

### 步骤 2C：本地补充（仅在 2A/2B 失败时）

1. 如果用户直接粘贴了表结构，解析其中的表名、字段、类型、注释

### 步骤 2D：梳理关联关系

1. 梳理输入表之间的关系（主外键、业务关联逻辑）
2. 输出《输入表梳理》，包含：
   - 每张输入表的：表名、所属分层、字段列表、分区字段、增量/全量策略
   - 表间关联关系图（ASCII 格式）
   - **数据来源标注**: 每个字段的结构来源（线上查询）

### 门禁清单

- [ ] 已实际调用 `/alibabacloud-dataworks-metadata` skill 并执行了 CLI 命令（或已说明失败原因）
- [ ] 已实际调用 `/alibabacloud-dataworks-data-ops` skill 并执行了 CLI 命令（或已说明失败原因）
- [ ] 已输出《输入表梳理》文档
- [ ] 两项均未通过时已向用户说明，获得用户确认后才可继续

---

## 第二步：需求理解

### 强制动作

1. 阅读 $ARGUMENTS 中的需求描述，再根据 上一步获取到的信息：输入表结构、线上逻辑、参考表逻辑
2. 明确以下要素（如有缺失，主动向用户确认）：
   - **业务过程**: 属于哪个业务域的什么业务过程
   - **分析维度**: 需要按哪些维度分析（时间/组织/商品/店铺/用户等）
   - **度量/指标**: 需要计算哪些度量值和派生指标
   - **数据粒度**: 事实表/汇总表的业务粒度是什么
   - **时间粒度**: 日/周/月
   - **增量/全量**: 数据是追加型事实还是状态型快照
   - **目标分层**: 输出表应放在哪一层（ODS/DWD/DWS/DWT/ADS）
3. 输出《需求理解确认》，以表格形式列出以上要素

### 门禁清单

- [ ] 已向用户输出《需求理解确认》表格
- [ ] **已获得用户明确确认**（用户回复"确认"/"正确"/"OK"等）
- [ ] 未获得确认前，禁止进入第二步

---


## 第三步：方案设计

### 强制动作

1. 依据 `dw-standards.md` 中的数仓开发规范
2. 设计输出表结构，包含：
   - **表名**: 遵循命名规范 `{layer}_{domain}_{entity}_{granularity}_{type}`
   - **字段列表**: 字段名、类型、来源、注释（标注退化维度/派生字段）
   - **分区策略**: 分区键及格式
   - **增量策略**: 全量快照(full) / 增量(asc)
   - **粒度声明**: 一行记录代表什么
3. 如果输出表已存在旧版本，必须先读取线上/现有 DDL 与字段清单，并在方案中明确“旧字段保留、新字段追加”的兼容策略：
   - 默认不改动原表旧字段，不重命名、不删除、不重排旧字段
   - 默认不改动旧的 `CREATE TABLE` 语句主体；如需补充字段，使用 `ALTER TABLE ... ADD COLUMNS`，或仅在 DDL 字段列表最后追加新字段
   - 旧表已有字段的口径、字段顺序、`INSERT` 输出顺序保持不变
   - 新需求字段统一追加在 DDL 字段列表最后，也追加在 `INSERT SELECT` 字段列表最后
   - 只有用户明确要求重构旧表或改旧字段时，才允许调整旧字段/旧 DDL
4. 说明关键设计决策：
   - 退化维度选择及理由
   - 多源合并/拆分决策
   - 全量 vs 增量的选择理由
5. **引用线上逻辑**: 如果步骤 2B 读取到了线上 SQL，必须在方案中说明哪些逻辑来自线上复用、哪些是新增
6. 输出《方案设计文档》

### 门禁清单

- [ ] 已向用户输出《方案设计文档》
- [ ] 方案中明确标注了复用逻辑与新增逻辑
- [ ] 已获得用户明确确认
- [ ] 未获得确认前，禁止进入第四步

---

## 第四步：SQL 编写

### 强制动作

1. 依据 `dw-standards.md` 中的 SQL 编写规范--> 模板结构 进行sql组装，严格按照方案设计中的表结构编写 SQL
2. SQL 必须遵循以下规范：
   - 开头设置 `set odps.sql.decimal.odps2 = true;` 等必要参数
   - INSERT OVERWRITE 语法
   - 分区使用调度参数（`${[yyyy-mm-dd]}`, `${[yyyy-mm-dd-1]}` 等）。所以分区都用参数 `${dt}` 即可。
   - COALESCE 处理 NULL
   - 大表 JOIN 小表使用 MAPJOIN hint
   - 数据倾斜场景使用 DISTRIBUTE BY / SKYLINE 或其它合理手段
   - 字段别名与目标表字段一一对应，添加行内注释 `-- 字段注释`
3. 对复杂逻辑添加简短注释说明 WHY（而非 WHAT）
4. 输出完整可执行的 SQL 文件，保存到项目目录

### 门禁清单

- [ ] SQL 文件已保存到项目目录
- [ ] 字段数量与 DDL 完全一致
- [ ] 字段顺序与 DDL 完全一致
- [ ] 已使用 `datawarehouse_max.` 前缀引用所有表（包括 FROM、JOIN，不包括 CREATE、INSERT OVERWRITE）

---

## 第五步：自检

### 强制动作

编写完成后逐项执行自检清单，每项必须给出 ✅ 或 ❌ 及具体说明：

- [ ] 粒度是否与设计一致（是否会产生数据膨胀）
- [ ] 分区字段是否正确赋值
- [ ] JOIN 条件是否包含分区裁剪
- [ ] 是否存在笛卡尔积风险
- [ ] 退化维度是否会引起数据不一致
- [ ] NULL 值处理是否完备
- [ ] 命名是否符合规范
- [ ] SQL 是否可直接提交执行
- [ ] 线上表结构是否与本地一致（如步骤 2A 查询成功）

### SQL 自检增强项

完成 SQL 后必须检查：

- [ ] 表引用是否带 `datawarehouse_max.` 前缀。
- [ ] `dt` 分区格式是否为 `yyyy-MM-dd`。
- [ ] DDL 字段数与 INSERT SELECT 顶层字段数是否一致。
- [ ] SELECT 字段顺序是否与 DDL 顺序一致，不一致就进行修改。
- [ ] 上游表字段是否能支撑 ADS 新增字段计算。

---

## 第六步：DataWorks 部署

SQL 自检通过后，必须部署到 DataWorks。

### 默认配置

以下参数已有约定的默认值，无需每次询问用户：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| **文件夹路径** | `bizroot/ADS/MaxCompute/数据开发/bg_ads/bg_ads_ai` | 所有新节点默认放到此路径下 |
| **节点名称** | 取 SQL 文件名（去 `.sql`） | 如 `ads_xxx.sql` → 节点名 `ads_xxx` |
| **调度周期** | 小时（指定 6 时） | `cycle-type` = `NOT_DAY`，cron: `00 00 6 * * ?` |
| **实例生成方式** | 发布后即时生成 | `start-effect-type` = `IMMEDIATE` |
| **失败自动重跑** | 开启 | `rerun-mode` = `ALL_ALLOWED` |
| **生效日期** | 永久生效 | 不传起止日期参数 |
| **上游依赖** | 仅根节点 | `dependent-type` = `NONE` |
| **参数** | `dt=$[yyyy-mm-dd-1]` | 节点调度参数，SQL 中用 `${dt}` 引用 |
| **节点类型** | `ODPS_SQL` (file-type=10) | MaxCompute SQL 节点 |

### 强制动作

1. **检查权限**: 先确认当前账号在 DataWorks 项目中有"数据开发-读写"权限和 `dataworks:CreateFile` RAM 权限。如无权限，直接告知用户并终止部署
2. **检查文件路径冲突**: 确认 `bizroot/ADS/MaxCompute/数据开发/bg_ads_ai` 路径是否存在（用户截图确认）
3. **创建文件**: 使用 `aliyun dataworks-public create-file` API 创建数据开发文件，**不能使用 create-node（FlowSpec 新版 API，旧版 IDE 不可见）**
4. **设置调度**: 通过 `--cron-express`、`--para-value` 等参数配置调度
5. **结果汇报**: 输出以下信息给用户确认

```bash
# 创建示例（file-type=10 代表 ODPS_SQL）
aliyun dataworks-public create-file \
  --project-id <PROJECT_ID> \
  --file-name "节点名称" \
  --file-type 10 \
  --file-folder-path "bizroot/ADS/MaxCompute/数据开发/bg_ads/bg_ads_ai" \
  --content "<SQL内容>" \
  --create-folder-if-not-exists true \
  --scheduler-type NORMAL \
  --cycle-type NOT_DAY \
  --cron-express "00 00 06 * * ?" \
  --para-value "dt=\$[yyyy-mm-dd-1]" \
  --auto-parsing false \
  --rerun-mode ALL_ALLOWED \
  --dependent-type NONE \
  --apply-schedule-immediately true \
  --auto-rerun-times 3 \
  --auto-rerun-interval-millis 180000 \
  --user-agent AlibabaCloud-Agent-Skills/alibabacloud-dataworks-datastudio-develop
```

### 如果用户提供了非默认配置

以下项目允许用户覆盖，其他保持默认：
- **文件夹路径**: 如果用户指定了其他路径
- **调度时间**: 如果用户指定了其他时间或周期
- **上游依赖**: 如果用户明确指定了依赖的上游节点名
- **参数**: 如果用户指定了额外参数

### 门禁清单

- [ ] 已向用户确认是否部署
- [ ] 已检查 DataWorks 权限（工作空间角色 + RAM 权限）
- [ ] 已确认文件夹路径存在
- [ ] 已使用 create-file API 创建成功（返回 FileId）
- [ ] 已向用户汇报创建结果

---

## 重要约束

- **未经用户确认需求理解，禁止进入第二步**
- **未经实际执行 skill CLI 命令（或说明失败原因），禁止进入第三步**
- **未经用户确认方案设计，禁止进入第四步**
- 严格遵循 `dw-standards.md` 中的规范，规范未覆盖的场景主动说明理由
- 所有 SQL 必须可直接在 MaxCompute 上执行，不可有语法错误
- 所有表引用必须使用 `datawarehouse_max.` 前缀（包括 INSERT OVERWRITE、FROM、JOIN，不包括 CREATE、INSERT OVERWRITE）
