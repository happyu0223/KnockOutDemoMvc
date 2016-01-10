var GMK = GMK || {};
GMK.Report = GMK.Report || {};
GMK.Report.start = function (route, element, success) {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        if (route.action === 'ByDaily') {
            commonModels.registerQueryFormEvent();
            var viewModel = new GMK.Report.ByDailyViewModel(commonModels, route, {});
        }
        window.vm = viewModel;
        viewModel.initialize(function () {
            ko.applyBindings(viewModel, element);
            if (success) {
                success(viewModel);
            }
        });
    });
};
GMK.Report.ByDailyViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    self.values = route.values;
    var base = GMK.Features.FeatureBase;
    self.items = ko.observableArray();
    self.toquery = ko.mapping.fromJS(route.values.query);
    self.queried = ko.observable({});
    self.query = {};
    (function (query) {
    })(self.query);
    self.setUrl = function (params) {
        var urlParams = utils.getCleanedEmpty(params);
        var url = location.pathname + '?' + $.param(urlParams, true);
        history.replaceState(null, null, url);
    };
    self.resultPagination = ko.observable({});
    self.resultSummary = ko.observable({});
    self.pageSummary = ko.computed(function () {
        return _.reduce(self.items(), function (m, r) {
            m.Weight = utils.roundWeight(m.Weight + (r.IsBuy ? -1 : 1) * utils.roundWeight(r.Weight));
            m.ActualWeight = utils.roundWeight(m.ActualWeight + (r.IsBuy ? -1 : 1) * utils.roundWeight(r.ActualWeight));
            m.Amount = utils.roundAmount(m.Amount + (r.IsBuy ? -1 : 1) * utils.roundAmount(r.Amount));
            return m;
        }, {
            Weight: 0,
            ActualWeight: 0,
            Amount: 0,
        });
    });
    self.search = function (params, callback) {
        base._get('Report/ListByDaily?' + $.param(utils.getCleanedEmpty(params), true), {}, function (result) {
            self.queried(params);
            self.setUrl(params);
            self.fill(result);
            if (callback) {
                callback();
            }
        });
    };
    self.fill = function (result) {
        var list = $.map(result.Data.list, function (r) {
            return r;
        });
        self.items(list);
        self.resultPagination(result.Data.pagination);
        self.resultSummary(result.Data.summary);
        base._pagination($("#pager"), +self.resultPagination().PageCount, +self.resultPagination().TotalCount, +self.queried().Pagination.CurrentPage, self.changePage, +self.resultPagination().PageSize);
    };
    self.changePage = function (newPage, pageSize) {
        var params = self.queried();
        var currPageSize = +self.toquery.Pagination.PageSize();
        var newPageSize = +pageSize || +params.Pagination.PageSize;
        params.Pagination.PageSize = newPageSize;
        self.toquery.Pagination.PageSize(newPageSize);
        params.Pagination.CurrentPage = newPageSize === currPageSize ? +newPage || +params.Pagination.CurrentPage : 1;
        self.search(params);
    };
    self.onSearch = function () {
        if (self.toquery.Pagination && self.toquery.Pagination.CurrentPage) {
            self.toquery.Pagination.CurrentPage(1);
        }
        var params = ko.mapping.toJS(self.toquery);
        self.search(params);
    };
    self.initialize = function (callback) {
        callback();
        var params = ko.mapping.toJS(self.toquery);
        self.search(params);
    };
    self.onExport = function () {
        utils.fileDownload(utils.urlAction('ExportByDaily', 'Report', utils.getCleanedEmpty(ko.toJS(self.queried))));
        //utils.downloadFile(function ($form, downloadToken) {
        //    var urlParams = $.extend(utils.getCleanedEmpty(ko.toJS(self.queried)), { downloadToken: downloadToken });
        //    var url = utils.urlAction('ExportByDaily', 'Report', urlParams);
        //    $form.attr('action', url);
        //    $form.empty();
        //});
    };
};

