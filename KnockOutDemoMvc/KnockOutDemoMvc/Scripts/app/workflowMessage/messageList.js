var GMK = GMK || {};
GMK.WorkflowMessage = GMK.WorkflowMessage || {};
GMK.WorkflowMessage.start = function () {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        var viewModel = new GMK.WorkflowMessage.MessageListViewModel(commonModels);
        viewModel.initialize();
        ko.applyBindings(viewModel);
    });
};
GMK.WorkflowMessage.MessageListViewModel = function (commonModels) {
    var self = this;
    self.commonModels = commonModels;
    self.messages = ko.observableArray();
    var today = moment(0, 'HH');
    self.dateRange = ko.observable(moment(today).add('d', -14).format('YYYY-MM-DD') + ' - ' + today.format('YYYY-MM-DD'));
    var base = GMK.Features.FeatureBase;
    self.initialize = function () {
        self.messages.removeAll();
        base._get(rootUrl + 'workflowMessage/listMessage', { isDefault: true }, function (result) {
            $.each(result.data, function (i, r) {
                var message = ko.mapping.fromJS(r);
                message.checked = ko.observable(false);
                self.messages.push(message);
            });
        });
    }

    self.onSearch = function () {
        self.messages.removeAll();
        base._get(rootUrl + 'workflowMessage/listMessage', utils.serialize("#searchForm .gmk-data-field"), function (result) {
            $.each(result.data, function (i, r) {
                var message = ko.mapping.fromJS(r);
                message.checked = ko.observable(false);
                self.messages.push(message);
            });
        });
    };
    
    self.onSendMail = function () {
        var checkedMessages = [];
        $.each(self.messages(), function (i, r) {
            if (r.checked()) {
                checkedMessages.push(ko.mapping.fromJS(r));
            }
        });

        if (checkedMessages == null || checkedMessages.length <= 0) {
            alert('请至少选择一项纪录');
            return;
        }

        base._post(rootUrl + 'workflowMessage/notifyMail', { messages: checkedMessages }, function (result) {
            if (result.status) {
                alert('发送成功');
            }
        });
    };

    self.checkAllItems = ko.observable(false);
    self.checkAllItems.subscribe(function (value) {
        var list = self.messages();
        for (var i = 0; i < list.length; i++) {
            list[i].checked(value);
        }
    });
};
$(function () {
    GMK.WorkflowMessage.start();
});