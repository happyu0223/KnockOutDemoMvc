var GMK = GMK || {};
GMK.Report = GMK.Report || {};
GMK.Report.ByFee = GMK.Report.ByFee || {};
GMK.Report.ByFee.start = function () {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        var viewModel = new GMK.Report.ByFee.IndexViewModel(commonModels, {
            listUrl: 'Report/ListFee',
        });
        window.vm = viewModel;
        ko.applyBindings(viewModel);
        viewModel.initialize();
    });
};
GMK.Report.ByFee.IndexViewModel = function (commonModels, actions) {
    var self = this, base = GMK.Features.FeatureBase, queryMappingOpts;
    self.commonModels = commonModels;

    function ReportView() {
        var $this = this;
        $this.list = ko.observableArray();
        $this.computedAmount = ko.computed(function () {
            var amount = 0;
            $.each($this.list(), function (i, item) {
                amount += item.amount;
            });
            return amount;
        });
        $this.totalAmount = ko.observable();
        $this.totalCount = ko.observable();
    }
    ReportView.call(this);

    self.query = constructQuery();
    self.customers = ko.observableArray(commonModels._AllWarehouses);
    self.feeTypes = (function () {
        var result = [], costFeeTypeOptions = self.commonModels.EnumOptions.CostFeeType;
        $.each(costFeeTypeOptions, function (i, e) {
            result.push({ name: e.text, id: e.value, isparent: true });
            result[result.length - 1].children = $.grep(self.commonModels.AllFee, function (item) {
                return item.feeType == e.value;
            });
        });
        return result;
    })();

    self.selectedFeeName = ko.observable(self.feeTypes[0].name);
    self.query.costFeeType(self.feeTypes[0].id);
    self.clearFeeType = function () {
        self.selectedFeeName('选择费用类型');
        self.query.feeType('');
        self.query.costFeeType('');
        self.customers([]);
    };

    self.selectFeeType = function (item) {
        self.selectedFeeName(item.name);
        var feeType;
        if (item.isparent) {
            self.query.feeType('');
            self.query.costFeeType(item.id);
            feeType = item.id;
        } else {
            self.query.feeType(item.id);
            self.query.costFeeType('');
            feeType = item.feeType;
        }
        if (feeType == commonModels.Enums.CostFeeType.WarehouseFee) self.customers(commonModels._AllWarehouses);
        else if (feeType == commonModels.Enums.CostFeeType.Logistics) self.customers(commonModels._AllLogistics);
        else self.customers([]);
    };

    function constructQuery() {
        var result = {
            customerId: ko.observable(),
            commodityIds: ko.observableArray([]),
            feeType: ko.observable(),
            costFeeType: ko.observable(),
            dateRange: ko.observable()
        };
        queryMappingOpts = {
            include: Object.getOwnPropertyNames(result)
        };
        return result;
    }

    var oldQuery;
    self.onSearch = function () {

        var queryData = self.getQueryParam();
        //var oldV = $.ajaxSettings.traditional;
        //$.ajaxSettings.traditional = true;
        base._get(actions.listUrl + '?' + $.param(queryData, true), {}, function (data) {
            fill(data);
        });
        //$.ajaxSettings.traditional = oldV;
    };

    self.getQueryParam = function () {
        var queryData = ko.mapping.toJS(self.query, queryMappingOpts);
        queryData.commodityIds = $.grep(queryData.commodityIds, function (item) {
            return !!item;
        });
        return queryData;
    };

    self.onExport = function () {
        utils.fileDownload(utils.urlAction('ExportFee', 'Report', ko.toJS(self.getQueryParam())));
        //utils.downloadFile(function ($form, downloadToken) {
        //    var params = $.extend(ko.toJS(self.getQueryParam()), { downloadToken: downloadToken });
        //    utils.cleanEmpty(params);
        //    var url = utils.urlAction('ExportFee', 'Report', params);
        //    $form.attr('action', url);
        //});
    };

    self.initialize = function () {
        self.onSearch();
    }

    function fill(data) {
        data = data.data.list;
        self.list(data.feeItems);
        self.totalAmount(data.totalAmount);
        self.totalCount(data.totalCount);
    }
};

$(document).ready(function () {
    GMK.Report.ByFee.start();
});
