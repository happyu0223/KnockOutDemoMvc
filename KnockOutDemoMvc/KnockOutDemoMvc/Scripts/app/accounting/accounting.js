var GMK = GMK || {};
GMK.Accounting = GMK.Accounting || {};
GMK.Accounting.start = function (route, element, success) {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        if (route.action === 'Report') {
            var viewModel = new GMK.Accounting.ReportViewModel(commonModels, route, {
                listUrl: 'Accounting/ListReport'
            });
            viewModel.initialize(function () {
                ko.applyBindings(viewModel, element);
                if (success) {
                    success();
                }
            });
        }
    });
};
GMK.Accounting.ReportViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.initialize = function (callback) {
        base._get(options.listUrl, {}, function (result) {
            self.items = ko.mapping.fromJS(result.Data);
            callback();
        });
    };
};
