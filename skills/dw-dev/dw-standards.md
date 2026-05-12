# 数仓开发规范

> 请根据公司实际规范修改以下内容。当前为根据项目 SQL 文件推断的默认规范。

## 一、分层规范

| 层级 | 前缀 | 职责 | 增量策略 |
|------|------|------|----------|
| ODS  | `ods_` | 原始数据接入，与业务库1:1映射，不做清洗 | 全量(_full) / 增量(_asc) |
| DWD  | `dwd_` | 明细数据清洗、标准化、维度退化 | 每日增量(_daily_asc) / 每日全量(_daily_full) |
| DIM  | `dim_` | 维表层，提供一些主要维度的维度表，比如dim_goods_daily_full,基本都属于每日全量表(_daily_full)|
| DWT  | `dwt_` | 宽表主题域整合 | 全量(daily_full) / 增量(daily_asc) |
| DWS  | `dws_` | 轻度汇总，按维度预聚合 | 增量(daily_asc) |
| ADS  | `ads_` | 应用层，面向报表/API | 按需 |

## 二、命名规范

### 表命名
```
datawarehouse_max.{layer}_{domain}_{entity}_{granularity}_{type}
```

- **layer**: ods / dim / dwd / dws / dwt / ads
- **domain**: 业务域（demeter/crm/scm/flow/market/mct/business 等）
- **entity**: 业务实体（coupon/order/sku/store/merchant 等）
- **granularity**: daily/weekly/monthly
- **type**:
  - `full` — 全量
  - `asc` —  增量

**示例**:
- `dwd_demeter_coupon_user_full` — DWD层，优惠券域，用户券明细，全量快照
- `dws_flow_mall_sku_base_daily_asc` — DWS层，流量域，商城SKU基础，日增量

### ODS层特殊规则
```
ods_{source_db}_{original_table}_{type}
```
- source_db: 来源数据库名（如 demeter, bg_crm）
- 保留业务库原始表名

### 字段命名
- 使用 `snake_case`
- 布尔/标志字段用 `is_xxx` / `has_xxx`
- 金额字段以 `_amount` 结尾
- 比率/费率字段以 `_rate` 结尾
- 数量字段以 `_count` / `_num` 结尾
- 时间字段以 `_time` / `_date` 结尾
- 退化维度字段与来源表保持一致，不做重命名

## 三、分区规范

| 层级 | 分区键 | 格式 | 示例 |
|------|--------|------|------|
| ODS  | `dt` | yyyy-MM-dd | `2024-01-01` |
| DWD  | `dt` | yyyy-MM-dd | `2024-01-01` |
| DWS  | `dt` | yyyy-MM-dd | `2024-01-01` |
| ADS  | `dt` | yyyy-MM-dd | `2024-01-01` |

**统一使用 `dt` 作为分区键**，避免与 ODS 层可能的 `pt` 混淆。跨层关联必须包含分区裁剪条件。

## 四、增量/全量策略选择

| 场景 | 策略 | 理由 |
|------|------|------|
| 维度表（量小，需最新状态） | 全量快照 full | 每日覆写，天然最终一致 |
| 状态型事实（有状态流转） | 全量快照 full | 需要任意时刻完整快照 |
| 追加型事实（无状态回退） | 增量 asc | 仅新增数据，无需覆写 |

## 五、维度退化原则

1. **高频关联维度优先退化**: 下游 80%+ 的查询需要 JOIN 的维度字段，退化解耦
2. **低变更维度适合退化**: 维度变更频率远低于事实变更频率
3. **全量快照表更适合退化**: 每日覆写保证退化维度与源维度最终一致
4. **增量表谨慎退化**: 需要额外机制保证退化维度同步更新

## 六、SQL 编写规范

### 6.1 模板结构
```sql
SET odps.sql.allow.fullscan=true;
SET odps.sql.type.system.odps2=true;
SET odps.sql.decimal.odps2=true;
SET odps.sql.hive.compatible=true;
-- 其他必要 set 参数
with cte as (
   select * from datawarehouse_max.xxxxx_daily_full where dt = '${dt}'
)

,cte2 as (
  select t1.* from datawarehouse_max.xxxxx_daily_asc t1 where t1.dt between date_sub('${dt}',6) and '${dt}'
)

insert overwrite table {target_table} partition(dt)
select
    field1          -- 字段注释
  , field2          -- 字段注释
  , ...
from  cte2
;
```

### 6.2 必要规则

- **分区裁剪**: JOIN 和 WHERE 条件必须包含分区字段过滤，避免全表扫描， daily_full表默认取最新的分区，即:dt = '${dt}'
- **NULL处理**: 使用 `COALESCE(field, default)` 处理可能为 NULL 的关键字段
- **MAPJOIN**: 大表 JOIN 小表（<2048MB）时使用 `/*+ MAPJOIN(small_table) */`
- **数据倾斜**:
  - 明确的倾斜键使用 `DISTRIBUTE BY`
  - 长尾场景考虑 `SKYLINE` 优化
  - GROUP BY 倾斜使用 `set odps.sql.groupby.skewratio=0.1`
- **调度参数**: 使用 DataWorks 调度参数而非硬编码日期
  - `$[yyyy-mm-dd]` — 业务日期
  - `$[yyyy-mm-dd-1]` — T-1

### 6.3 代码风格

- 字段对齐：逗号前置，缩进对齐
- 行内注释：每个 SELECT 字段后跟 `-- 字段注释`
- CTE 命名：语义化命名，如 `base_orders`, `dim_store`, `agg_daily`
- 子查询嵌套不超过3层，超过的使用 CTE 拆分

## 七、数据质量规范

- 主键字段不可为 NULL
- 金额字段 COALESCE 为 0，不可为 NULL
- 外键字段 COALESCE 为 -1 或 0，不可为 NULL
- 分区字段不可为 NULL 或空串
- 增量表必须有去重逻辑（按主键 + 分区去重）
