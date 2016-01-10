/**
 * Created by dawson.liu on 13-11-13.
 */


var GMK = GMK || {};
GMK.Report = GMK.Report || {};
GMK.Report.ForExposure = GMK.Report.ForExposure || {};

GMK.Report.ForExposure.start = function () {
    GMK.Features.CommonModels.onReady(function (models) {
        var viewModel = new GMK.Report.ForExposure.ListViewModel(models, {
            searchUrl: 'Report/QueryExposure',
            contractExposureUrl: 'Report/ListContractExposure',
            adjustFutureTradeRecordUrl: 'Report/ListAdjustFutureTradeRecord'
        });
        viewModel.initialize();
        ko.applyBindings(viewModel);
    });
};

GMK.Report.ForExposure.ListViewModel = function (models, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    function viewModel() {
        var vm = this;
        vm.contractList = ko.observableArray();
        vm.adjustmentList = ko.observableArray();
        vm.selectedCommodity = ko.observable(models.AllCommodities[0].id);
        vm.accountingEntityId = ko.observable();

        vm.TotalContractExposureVolume = ko.observable();
        vm.AdjustExposureVolume = ko.observable();
        vm.AcutalExposureVolume = ko.observable();

        vm.fill = function (result) {
            vm.TotalContractExposureVolume(result.TotalContractExposureVolume);
            vm.AdjustExposureVolume(result.AdjustExposureVolume);
            vm.AcutalExposureVolume(result.AcutalExposureVolume);
        };
        vm.fillContract = function (result) {
            var items = result.Data.list;
            $.each(items, function(i, item){
                item.DiscountWeight = item.ActualWeight / 1.17;
                item.FutureWeight = item.DiscountWeight - item.ExposureVolumne;
            });
            vm.contractList(items);
            base._paginate($('#contracts-pager'), result.Data.pagination, function () {
                return utils.serialize("#searchForm .gmk-data-field")
            }, options.contractExposureUrl, vm.fillContract);
        };
        vm.fillAdjustment = function (result) {
            vm.adjustmentList(result.Data.list);
            base._paginate($('#adjustment-pager'), result.Data.pagination, function () {
                return utils.serialize("#searchForm .gmk-data-field")
            }, options.adjustFutureTradeRecordUrl, vm.fillAdjustment);
        };
    }

    viewModel.call(this);

    self.onSearch = function () {
        base._get(options.searchUrl, { CommodityId: self.selectedCommodity(), accountingEntityId: self.accountingEntityId() }, function (data) {
            self.fill(data);

            base._get(options.contractExposureUrl, utils.serialize("#searchForm .gmk-data-field"), function (data) {
                self.fillContract(data);

                base._get(options.adjustFutureTradeRecordUrl, utils.serialize("#searchForm .gmk-data-field"), function (data) {
                    self.fillAdjustment(data);
                }, true);
            });
        });
    };

    self.initialize = function () {
        self.onSearch();
    };
}

$(document).ready(function () {
    GMK.Report.ForExposure.start();
});