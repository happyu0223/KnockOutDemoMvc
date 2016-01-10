var GMK = GMK || {};
GMK.WorkflowMessage = GMK.WorkflowMessage || {};
GMK.WorkflowMessage.start = function () {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        var viewModel= new GMK.WorkflowMessage.TaskListViewModel(commonModels);
        viewModel.initialize();
        ko.applyBindings(viewModel);
    });
};
GMK.WorkflowMessage.TaskListViewModel = function (commonModels) {
    var self = this;
    self.commonModels = commonModels;
    self.tasks = ko.observableArray();
    var base = GMK.Features.FeatureBase;
    self.initialize = function () {
        var href = window.location.href;
        var index = href.indexOf('?');
        base._get('workflowMessage/listTask' + (index >= 0 ? href.substr(index) : ''),{}, function (result) {
            self.tasks(result.data);
        });
        self.onWechatResend = function (item) {
            base._post('workflowMessage/wechatResend', { taskId: item.wfUserTaskId }, function () {
                alert('待办事项'+item.wfUserTaskId + '已重发');
            });
        };
    }
};
$(function () {
    GMK.WorkflowMessage.start();
});
