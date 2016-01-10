var GMK = GMK || {};
GMK.SystemConfig = GMK.SystemConfig || {};
GMK.SystemConfig.start = function (route, element, success) {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        var viewModel;
        if (route.action === 'Index') {
            viewModel = new GMK.SystemConfig.IndexViewModel(commonModels, route, {
            });
        } else if (route.action === 'CompanyClean') {
            viewModel = new GMK.SystemConfig.CompanyCleanViewModel(commonModels, route, {
            });
        }
        window.vm = viewModel;
        viewModel.initialize(function () {
            ko.applyBindings(viewModel, element);
            if (success) {
                success();
            }
        });
    });
};
GMK.SystemConfig.IndexViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    self.values = route.values;
    var base = GMK.Features.FeatureBase;
    self.CommonModelVersion = ko.observable();
    self.InstrumentVersion = ko.observable();
    self.initialize = function (callback) {
        base._get('SystemConfig/InstrumentVersion', null, function (result) {
            self.InstrumentVersion(result.Data);
        });
        base._get('SystemConfig/CommonModelVersion', null, function (result) {
            self.CommonModelVersion(result.Data);
            if (callback) {
                callback();
            }
        });
    };
    self.onUpdateCommonModelVersion = function () {
        base._post('SystemConfig/CommonModelVersion', null, function (result) {
            self.CommonModelVersion(result.Data);
        });
    };
    self.onUpdateInstrumentVersion = function () {
        base._post('SystemConfig/InstrumentVersion', null, function (result) {
            self.InstrumentVersion(result.Data);
        });
    };
};
GMK.SystemConfig.CompanyCleanViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    self.values = route.values;
    var base = GMK.Features.FeatureBase;
    self.initialize = function (callback) {
        if (callback) {
            callback();
        }
    };
    self.onCompanyClean = function () {
        base._post('SystemConfig/CompanyClean', null, function (result) {
            utils.alert(result.Data);
        });
    };
};
