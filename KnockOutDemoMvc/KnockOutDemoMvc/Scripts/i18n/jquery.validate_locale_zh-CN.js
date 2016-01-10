jQuery.extend(jQuery.validator.messages, {
	required: "必填字段。",
	remote: "请修正此字段。",
	email: "请输入有效的电子邮件地址。",
	url: "请输入有效的URL。",
	date: "请输入有效的日期。",
	dateISO: "请输入有效的日期（ISO）。",
	number: "请输入有效的数字。",
	digits: "请输入有效的整数。",
	creditcard: "请输入有效的信用卡号。",
	equalTo: "请再次输入相同的值。",
	maxlength: $.validator.format("请最多输入{0}个字符。"),
	minlength: $.validator.format("请至少输入{0}个字符。"),
	rangelength: $.validator.format("请输入{0}到{1}个字符。"),
	range: $.validator.format("请输入{0}到{1}的值。"),
	max: $.validator.format("请输入小于等于{0}的值。"),
	min: $.validator.format("请输入大于等于{0}的值。")
});
