var GMK = GMK || {};
GMK.Home = GMK.Home || {};
GMK.Home.start = function (route, element, success) {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        var viewModel;
        if (route.action === 'Index') {
            viewModel = new GMK.Home.IndexViewModel(commonModels, route, {});
        }
        if (viewModel) {
            viewModel.initialize(function () {
                ko.applyBindings(viewModel, element);
                if (success) {
                    success(viewModel);
                }
            });
        }
    });
};
GMK.Home.IndexViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.initialize = function (callback) {
        self.todo.loadItems();
        self.sent.loadItems();
        self.unread.loadItems();
        if (callback) {
            callback();
        }
    };
    self.todo = { values: route.values.todo, searchUrl: 'WorkflowMessage/TaskList' };
    self.sent = { values: route.values.sent, searchUrl: 'WorkflowMessage/RequestList' };
    self.unread = { values: route.values.unread, searchUrl: 'WorkflowMessage/MessageList' };
    function common(part) {
        part.items = ko.observableArray();
        part.loadItems = function (callback) {
            base._get(part.searchUrl, part.values.query, function (result) {
                var items = $.map(result.Data.list, function (r) {
                    return ko.mapping.fromJS(r);
                });
                part.items(items);
                if (callback) {
                    callback();
                }
            });
        };
        part.reload = function () {
            part.loadItems();
        };
    }
    common(self.todo);
    common(self.sent);
    common(self.unread);
};
