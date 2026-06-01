# Python+Hive 电商订单离线分析系统

## 项目简介
《数据仓库技术与应用》课程设计，基于 **Hadoop+Hive+Python+Vue+ECharts**，完成电商订单数据**离线数仓建模、ETL、分析、可视化大屏**全流程。

## 技术栈
- 大数据：Hadoop、Hive
- 数据交互：Python、Impyla、Pandas
- 前端：HTML、JavaScript、ECharts
- 数据库：MySQL（Hive元数据）

## 核心功能
- ✅ Hadoop+Hive 集群搭建与配置
- ✅ 三层数仓：ODS → CDM → ADS
- ✅ Python 抽取 Hive 数据、清洗、格式转换
- ✅ 计算消费频次、客单价、月度销售额
- ✅ ECharts 可视化：直方图、折线、饼图、热力图
- ✅ 交互式大屏：搜索、分页、图表下载

## 项目结构
src/             Hive建表与ETL脚本 / Python代码、可视化前端
data/            订单原始/清洗数据
docs/            课程设计报告
screenshots/     环境、运行、大屏截图

## 运行方式
1. 启动 Hadoop、Hive、HiveServer2
2. 执行 Hive SQL 建表、导入数据
3. 运行 Python：1_extract_and_export.py → 2_data_cleaning.py
4. 浏览器打开 index.html 查看可视化大屏

## 项目亮点
- ✅ 标准离线数仓三层架构
- ✅ Python+Hive 端到端数据流程
- ✅ 完整可视化大屏，6类图表+交互
- ✅ 可直接用于大数据/数仓求职展示