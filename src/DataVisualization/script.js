let charts = {}; // 存储图表实例
let globalTableData = []; // 原始表格数据
let filteredTableData = []; // 过滤后的表格数据
let currentPage = 1; // 当前页码
const pageSize = 10; // 每页条数

// 1. 加载order_data_cleaned.json
async function loadData() {
	console.log("开始加载order_data_cleaned.json...");
	try {
		// 强制加载本地JSON文件
		const response = await fetch('order_data_cleaned.json', {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		});

		// 检查响应状态
		if (!response.ok) {
			throw new Error(`HTTP错误：状态码 ${response.status}，请检查文件是否存在或路径是否正确`);
		}

		const data = await response.json();
		console.log("JSON数据加载成功：", data);

		// 确保返回数组
		const result = Array.isArray(data) ? data : [data];
		console.log("处理后的数据格式：", result);
		return result;

	} catch (error) {
		console.error("数据加载失败：", error.message);
		// 抛出错误
		throw new Error(`加载order_data_cleaned.json失败：${error.message}\n请确认文件在同一目录下，且格式为有效的JSON`);
	}
}

// 2. 处理数据（严格解析JSON数据）
function processData(rawData) {
	console.log("开始处理数据...");
	// 数据转换与过滤（确保时间和数值有效）
	const data = rawData.map((item, index) => {
		// 解析时间（兼容时间戳和字符串）
		let orderTime;
		if (typeof item.order_time === 'number') {
			orderTime = new Date(item.order_time);
		} else if (typeof item.order_time === 'string') {
			orderTime = new Date(item.order_time);
		} else {
			orderTime = new Date();
		}

		return {
			order_id: `ORD${10000 + index}`,
			user_id: item.user_id || `未知用户${index}`,
			order_amount: Number(item.order_amount) || 0,
			order_time: orderTime,
			hour: orderTime.getHours()
		};
	}).filter(item => !isNaN(item.order_time.getTime()) && item.order_amount >= 0);

	console.log("过滤后有效数据：", data.length, "条");

	// 核心指标计算
	const totalOrders = data.length;
	const totalSales = data.reduce((sum, item) => sum + item.order_amount, 0).toFixed(2);
	const userList = [...new Set(data.map(item => item.user_id))];
	const totalUsers = userList.length;
	const avgOrderAmount = totalOrders > 0 ? (totalSales / totalOrders).toFixed(2) : "0.00";

	// 用户消费频次
	const userOrderCount = {};
	data.forEach(item => {
		userOrderCount[item.user_id] = (userOrderCount[item.user_id] || 0) + 1;
	});
	const totalOrderCount = Object.values(userOrderCount).reduce((a, b) => a + b, 0);
	const avgOrderFrequency = totalUsers > 0 ? (totalOrderCount / totalUsers).toFixed(1) : "0.0";

	// 订单量分布（用户下单次数分布）
	const orderDistribution = {};
	Object.values(userOrderCount).forEach(count => {
		const key = `${count}单`;
		orderDistribution[key] = (orderDistribution[key] || 0) + 1;
	});
	const distX = Object.keys(orderDistribution).sort((a, b) => parseInt(a) - parseInt(b));
	const distY = distX.map(key => orderDistribution[key]);
	console.log("订单量分布：", distX, distY);

	// 月度销售额
	const monthlySales = {};
	data.forEach(item => {
		const month =
			`${item.order_time.getFullYear()}-${(item.order_time.getMonth() + 1).toString().padStart(2, '0')}`;
		monthlySales[month] = (monthlySales[month] || 0) + item.order_amount;
	});
	const monthX = Object.keys(monthlySales).sort();
	const monthY = monthX.map(month => monthlySales[month].toFixed(2));
	console.log("月度销售额：", monthX, monthY);

	// 客单价区间分布
	const priceRanges = {
		'0-200元': 0,
		'201-500元': 0,
		'501-800元': 0,
		'801元以上': 0
	};
	data.forEach(item => {
		if (item.order_amount <= 200) priceRanges['0-200元']++;
		else if (item.order_amount <= 500) priceRanges['201-500元']++;
		else if (item.order_amount <= 800) priceRanges['501-800元']++;
		else priceRanges['801元以上']++;
	});
	const priceLabels = Object.keys(priceRanges);
	const priceData = Object.values(priceRanges);
	console.log("客单价区间：", priceLabels, priceData);

	// Top10用户消费排行
	const userSales = {};
	data.forEach(item => {
		userSales[item.user_id] = (userSales[item.user_id] || 0) + item.order_amount;
	});
	const top10 = Object.entries(userSales).sort((a, b) => b[1] - a[1]).slice(0, 10);
	const topLabels = top10.map(item => item[0]);
	const topData = top10.map(item => item[1].toFixed(2));
	console.log("Top10用户：", topLabels, topData);

	// 每日订单量热力图数据
	const dailyOrders = {};
	const dates = [...new Set(data.map(item => {
		return `${item.order_time.getFullYear()}-${(item.order_time.getMonth() + 1).toString().padStart(2, '0')}-${item.order_time.getDate().toString().padStart(2, '0')}`;
	}))].sort();
	const hours = Array.from({
		length: 24
	}, (_, i) => i);

	data.forEach(item => {
		const date =
			`${item.order_time.getFullYear()}-${(item.order_time.getMonth() + 1).toString().padStart(2, '0')}-${item.order_time.getDate().toString().padStart(2, '0')}`;
		const hour = item.order_time.getHours();
		const key = `${date}-${hour}`;
		dailyOrders[key] = (dailyOrders[key] || 0) + 1;
	});

	const heatmapData = dates.map(date => {
		return hours.map(hour => dailyOrders[`${date}-${hour}`] || 0);
	});
	console.log("热力图数据：", dates.length, "天，", hours.length, "小时");

	// 消费时段分布
	const timePeriods = {
		'凌晨(0-6点)': 0,
		'上午(7-12点)': 0,
		'下午(13-18点)': 0,
		'晚上(19-23点)': 0
	};
	data.forEach(item => {
		if (item.hour >= 0 && item.hour < 6) timePeriods['凌晨(0-6点)']++;
		else if (item.hour < 12) timePeriods['上午(7-12点)']++;
		else if (item.hour < 18) timePeriods['下午(13-18点)']++;
		else timePeriods['晚上(19-23点)']++;
	});
	const timeLabels = Object.keys(timePeriods);
	const timeData = Object.values(timePeriods);
	console.log("消费时段：", timeLabels, timeData);

	// 表格数据
	const tableData = data.map(item => ({
		order_id: item.order_id,
		user_id: item.user_id,
		order_amount: item.order_amount,
		order_time: `${item.order_time.getFullYear()}-${(item.order_time.getMonth() + 1).toString().padStart(2, '0')}-${item.order_time.getDate().toString().padStart(2, '0')} ${item.order_time.getHours().toString().padStart(2, '0')}:${item.order_time.getMinutes().toString().padStart(2, '0')}`,
		time_period: item.hour >= 0 && item.hour < 6 ? '凌晨' : item.hour < 12 ? '上午' : item.hour < 18 ?
			'下午' : '晚上',
		amount_level: item.order_amount <= 200 ? 'low' : item.order_amount <= 500 ? 'medium' : 'high'
	}));

	console.log("数据处理完成");
	return {
		basicStats: {
			totalOrders,
			totalUsers,
			totalSales,
			avgOrderAmount,
			avgOrderFrequency
		},
		orderDistribution: {
			xAxis: distX,
			yAxis: distY
		},
		monthlySales: {
			xAxis: monthX,
			yAxis: monthY
		},
		priceRange: {
			labels: priceLabels,
			data: priceData
		},
		topUsers: {
			labels: topLabels,
			data: topData
		},
		heatmap: {
			dates,
			hours,
			data: heatmapData
		},
		timePeriod: {
			labels: timeLabels,
			data: timeData
		},
		tableData: tableData
	};
}

//  初始化图表
function initCharts(data) {
	console.log("开始初始化图表...");

	// 销毁旧图表实例
	Object.values(charts).forEach(chart => chart.dispose());
	charts = {};

	// 用户订单量分布直方图
	const orderDistDom = document.getElementById('order-distribution-chart');
	if (orderDistDom) {
		charts.orderDist = echarts.init(orderDistDom);
		charts.orderDist.setOption({
			tooltip: {
				trigger: 'axis',
				formatter: '{b}: {c} 位用户'
			},
			grid: {
				left: '3%',
				right: '4%',
				bottom: '3%',
				containLabel: true
			},
			xAxis: {
				type: 'category',
				data: data.orderDistribution.xAxis
			},
			yAxis: {
				type: 'value',
				minInterval: 1
			},
			series: [{
				name: '用户分布',
				type: 'bar',
				data: data.orderDistribution.yAxis,
				itemStyle: {
					color: '#d7a6ff'
				},
				label: {
					show: true,
					position: 'top'
				}
			}],
			backgroundColor: 'transparent'
		});
		console.log("订单量分布图表初始化完成");
	}

	// 月度销售额趋势图
	const monthlySalesDom = document.getElementById('monthly-sales-chart');
	if (monthlySalesDom) {
		charts.monthlySales = echarts.init(monthlySalesDom);
		charts.monthlySales.setOption({
			tooltip: {
				trigger: 'axis',
				formatter: '{b}: {c} 元'
			},
			grid: {
				left: '3%',
				right: '4%',
				bottom: '3%',
				containLabel: true
			},
			xAxis: {
				type: 'category',
				data: data.monthlySales.xAxis
			},
			yAxis: {
				type: 'value'
			},
			series: [{
				name: '销售额',
				type: 'line',
				data: data.monthlySales.yAxis.map(Number),
				smooth: true,
				itemStyle: {
					color: '#ffaa7f'
				},
				lineStyle: {
					width: 2
				}
			}],
			backgroundColor: 'transparent'
		});
		console.log("月度销售额图表初始化完成");
	}

	// 客单价区间分布饼图
	const priceRangeDom = document.getElementById('price-range-chart');
	if (priceRangeDom) {
		charts.priceRange = echarts.init(priceRangeDom);
		charts.priceRange.setOption({
			tooltip: {
				trigger: 'item',
				formatter: '{b}: {c}单 ({d}%)'
			},
			legend: {
				bottom: '10%',
				left: 'center',
				textStyle: {
					fontSize: 12
				},
				itemGap: 10
			},
			series: [{
				name: '客单价区间',
				type: 'pie',
				radius: ['40%', '70%'],
				center: ['50%', '40%'],
				data: data.priceRange.labels.map((label, i) => ({
					name: label,
					value: data.priceRange.data[i]
				})),
				itemStyle: {
					borderRadius: 8
				}
			}],
			backgroundColor: 'transparent'
		});
		console.log("客单价区间图表初始化完成");
	}

	// Top10用户消费排行
	const topUserDom = document.getElementById('top-user-chart');
	if (topUserDom) {
		charts.topUser = echarts.init(topUserDom);
		charts.topUser.setOption({
			tooltip: {
				trigger: 'axis',
				formatter: '{b}: {c} 元'
			},
			grid: {
				left: '15%',
				right: '4%',
				bottom: '3%',
				containLabel: true
			},
			xAxis: {
				type: 'value'
			},
			yAxis: {
				type: 'category',
				data: data.topUsers.labels.reverse()
			},
			series: [{
				name: '消费金额',
				type: 'bar',
				data: data.topUsers.data.map(Number).reverse(),
				itemStyle: {
					color: '#ff8f91'
				}
			}],
			backgroundColor: 'transparent'
		});
		console.log("Top10用户图表初始化完成");
	}

	// 每日订单量热力图
	const heatmapDom = document.getElementById('daily-order-heatmap');
	if (heatmapDom) {
		charts.heatmap = echarts.init(heatmapDom);
		const heatmapSeriesData = [];
		data.heatmap.dates.forEach((date, i) => {
			data.heatmap.hours.forEach((hour, j) => {
				heatmapSeriesData.push([i, j, data.heatmap.data[i][j]]);
			});
		});

		charts.heatmap.setOption({
			tooltip: {
				formatter: ({
					value
				}) => {
					return `${data.heatmap.dates[value[0]]} ${data.heatmap.hours[value[1]]}:00\n订单量：${value[2]}`;
				}
			},
			xAxis: {
				type: 'category',
				data: data.heatmap.hours.map(h => `${h}:00`),
				axisLabel: {
					fontSize: 10
				}
			},
			yAxis: {
				type: 'category',
				data: data.heatmap.dates,
				axisLabel: {
					fontSize: 10
				}
			},
			visualMap: {
				min: 0,
				max: Math.max(...data.heatmap.data.flat()) || 1,
				orient: 'horizontal',
				left: 'center',
				bottom: 0,
				textStyle: {
					fontSize: 12
				}
			},
			series: [{
				type: 'heatmap',
				data: heatmapSeriesData
			}],
			backgroundColor: 'transparent'
		});
		console.log("热力图初始化完成");
	}

	// 消费时段分布饼图
	const timePeriodDom = document.getElementById('time-period-chart');
	if (timePeriodDom) {
		charts.timePeriod = echarts.init(timePeriodDom);
		charts.timePeriod.setOption({
			tooltip: {
				trigger: 'item',
				formatter: '{b}: {c}单 ({d}%)'
			},
			legend: {
				left: '10%',
				top: 'center',
				textStyle: {
					fontSize: 12
				},
				itemGap: 10
			},
			series: [{
				name: '消费时段',
				type: 'pie',
				radius: ['40%', '70%'],
				center: ['65%', '50%'],
				data: data.timePeriod.labels.map((label, i) => ({
					name: label,
					value: data.timePeriod.data[i]
				})),
				itemStyle: {
					borderRadius: 8
				}
			}],
			backgroundColor: 'transparent'
		});
		console.log("消费时段图表初始化完成");
	}

	// 窗口缩放适配
	window.addEventListener('resize', () => {
		Object.values(charts).forEach(chart => chart.resize());
	});

	// 主题切换事件
	document.getElementById('theme-order-dist')?.addEventListener('click', () => {
		const option = charts.orderDist.getOption();
		const isDark = option.backgroundColor === '#1a1a1a';
		charts.orderDist.setOption({
			backgroundColor: isDark ? 'transparent' : '#1a1a1a',
			textStyle: {
				color: isDark ? '#333' : '#fff'
			},
			xAxis: {
				axisLabel: {
					color: isDark ? '#666' : '#fff'
				}
			},
			yAxis: {
				axisLabel: {
					color: isDark ? '#666' : '#fff'
				}
			}
		});
	});

	document.getElementById('theme-monthly-sales')?.addEventListener('click', () => {
		const option = charts.monthlySales.getOption();
		const isDark = option.backgroundColor === '#1a1a1a';
		charts.monthlySales.setOption({
			backgroundColor: isDark ? 'transparent' : '#1a1a1a',
			textStyle: {
				color: isDark ? '#333' : '#fff'
			},
			xAxis: {
				axisLabel: {
					color: isDark ? '#666' : '#fff'
				}
			},
			yAxis: {
				axisLabel: {
					color: isDark ? '#666' : '#fff'
				}
			}
		});
	});

	// 下载图表事件
	document.getElementById('download-order-dist')?.addEventListener('click', () => {
		const img = charts.orderDist.getDataURL({
			type: 'png',
			pixelRatio: 2
		});
		const a = document.createElement('a');
		a.href = img;
		a.download = '订单量分布.png';
		a.click();
	});

	document.getElementById('download-monthly-sales')?.addEventListener('click', () => {
		const img = charts.monthlySales.getDataURL({
			type: 'png',
			pixelRatio: 2
		});
		const a = document.createElement('a');
		a.href = img;
		a.download = '月度销售额.png';
		a.click();
	});

	// 强制图表重绘
	setTimeout(() => {
		Object.values(charts).forEach(chart => chart.resize());
	}, 100);

}

// 4. 渲染表格（修复作用域和事件绑定问题）
function renderTable(data) {
	globalTableData = data;
	filteredTableData = [...globalTableData];

	const totalRowsEl = document.getElementById('total-table-rows');
	totalRowsEl.innerText = filteredTableData.length;

	// 渲染指定页
	function renderPage(page) {
		currentPage = page;
		const start = (page - 1) * pageSize;
		const end = start + pageSize;
		const rows = filteredTableData.slice(start, end);

		const tbody = document.getElementById('order-table-body');
		if (!tbody) return;

		tbody.innerHTML = rows.map(item => `
	            <tr>
	                <td>${item.order_id}</td>
	                <td>${item.user_id}</td>
	                <td class="amount-${item.amount_level}">${item.order_amount}</td>
	                <td>${item.order_time}</td>
	                <td>${item.time_period}</td>
	                <td>
	                    <span class="amount-${item.amount_level}" style="
	                        padding: 2px 8px;
	                        border-radius: 20px;
	                        font-size: 12px;
	                        background: ${item.amount_level === 'low' ? 'rgba(16,185,129,0.1)' : item.amount_level === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)'};
	                        color: ${item.amount_level === 'low' ? '#10b981' : item.amount_level === 'medium' ? '#f59e0b' : '#ef4444'};
	                    ">
	                        ${item.amount_level === 'low' ? '低额' : item.amount_level === 'medium' ? '中额' : '高额'}
	                    </span>
	                </td>
	            </tr>
	        `).join('');

		// 更新分页信息
		document.getElementById('page-range').innerText = `${start + 1}-${Math.min(end, filteredTableData.length)}`;

		// 动态生成分页按钮
		generatePaginationButtons();
	}

	// 动态生成分页按钮
	function generatePaginationButtons() {
		const totalPages = Math.ceil(filteredTableData.length / pageSize);
		const paginationContainer = document.querySelector('.table-pagination > div:last-child');
		if (!paginationContainer) return;

		// 保留上一页和下一页按钮，清空中间页码
		paginationContainer.innerHTML = `
	            <button class="pagination-btn" id="prev-page" ${currentPage === 1 ? 'disabled' : ''}><i class="fa fa-angle-left"></i></button>
	            <!-- 动态页码将插入这里 -->
	            <button class="pagination-btn" id="next-page" ${currentPage === totalPages ? 'disabled' : ''}><i class="fa fa-angle-right"></i></button>
	        `;

		// 插入动态页码按钮
		const nextBtn = document.getElementById('next-page');
		for (let i = 1; i <= totalPages; i++) {
			const pageBtn = document.createElement('button');
			pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
			pageBtn.dataset.page = i;
			pageBtn.innerText = i;
			pageBtn.addEventListener('click', () => renderPage(i));
			paginationContainer.insertBefore(pageBtn, nextBtn);
		}

		// 重新绑定上一页/下一页事件
		document.getElementById('prev-page').addEventListener('click', () => {
			if (currentPage > 1) renderPage(currentPage - 1);
		});
		document.getElementById('next-page').addEventListener('click', () => {
			if (currentPage < totalPages) renderPage(currentPage + 1);
		});
	}

	// 初始渲染第一页
	renderPage(1);

	// 搜索功能
	document.getElementById('search-btn')?.addEventListener('click', () => {
		const keyword = document.getElementById('search-order').value.trim().toLowerCase();
		// 从原始数据中过滤，避免多次过滤导致数据丢失
		filteredTableData = globalTableData.filter(item =>
			item.user_id.toLowerCase().includes(keyword) ||
			item.order_amount.toString().includes(keyword) ||
			item.order_id.toLowerCase().includes(keyword)
		);
		totalRowsEl.innerText = filteredTableData.length;
		renderPage(1); // 重置到第一页
	});

	// 支持回车搜索
	document.getElementById('search-order')?.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') {
			document.getElementById('search-btn').click();
		}
	});
}

// 初始化页面
async function init() {
	// 显示加载状态
	const loadingEl = document.getElementById('loading');
	loadingEl.style.display = 'flex';

	try {
		// 加载数据
		const rawData = await loadData();

		// 处理数据
		const processedData = processData(rawData);

		// 填充核心指标
		document.getElementById('total-orders').innerText = processedData.basicStats.totalOrders;
		document.getElementById('total-users').innerText = processedData.basicStats.totalUsers;
		document.getElementById('total-sales').innerText = processedData.basicStats.totalSales;
		document.getElementById('avg-order-amount').innerText = processedData.basicStats.avgOrderAmount;
		document.getElementById('avg-order-frequency').innerText = processedData.basicStats.avgOrderFrequency;

		// 初始化图表
		initCharts(processedData);

		// 渲染表格
		renderTable(processedData.tableData);

		console.log("页面初始化完成");

	} catch (error) {
		console.error("初始化失败：", error);
		loadingEl.innerHTML = `
            <div style="color: #ef4444; font-size: 16px; text-align: center;">
                <i class="fa fa-exclamation-circle"></i>
                <p>数据加载失败：${error.message}</p>
                <p>请检查order_data_cleaned.json是否在同一目录，且格式正确</p>
            </div>
        `;
		return;
	}

	// 隐藏加载状态
	loadingEl.style.display = 'none';

	// 刷新按钮事件
	document.getElementById('refresh-btn')?.addEventListener('click', async () => {
		loadingEl.style.display = 'flex';
		await init();
	});
}

// 启动页面（DOM加载完成后执行）
document.addEventListener('DOMContentLoaded', init);