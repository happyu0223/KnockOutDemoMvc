/**
 * Created by dawson.liu on 13-10-15.
 */


var GMK = GMK || {};
GMK.Report = GMK.Report || {};
GMK.Report.start = function (route, element, success) {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        if (route.action === 'ForRisk') {
            commonModels.registerQueryFormEvent();
            var viewModel = new GMK.Report.ForRiskViewModel(commonModels, route, {});
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
GMK.Report.ForRiskViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    self.values = route.values;
    var base = GMK.Features.FeatureBase;
    self.items = ko.observableArray();
    self.toquery = ko.mapping.fromJS(route.values.query);
    self.queried = ko.observable({});
    self.query = {};
    self.setUrl = function (params) {
        var urlParams = utils.getCleanedEmpty(params);
        var url = location.pathname + '?' + $.param(urlParams, true);
        history.replaceState(null, null, url);
    };
    self.resultPagination = ko.observable({});
    self.resultSummary = ko.observable({});
    self.pageSummary = ko.computed(function () {
        var summary = self.items().reduce(function (m, r) {
            m.TheoreticalAmount = utils.roundAmount(m.TheoreticalAmount + utils.roundAmount(r.TheoreticalAmount));
            m.HappenedAmount = utils.roundAmount(m.HappenedAmount + utils.roundAmount(r.HappenedAmount));
            m.RiskAmount = utils.roundAmount(m.RiskAmount + utils.roundAmount(r.RiskAmount));
            return m;
        }, {
            TheoreticalAmount: 0,
            HappenedAmount: 0,
            RiskAmount: 0,
        });
        summary.RiskRate = summary.RiskAmount / Math.abs(summary.TheoreticalAmount);
        return summary;
    });
    var expandingItem, $tableQueryResult = $('#tableQueryResult');
    function _initializeExpandable() {
        if ($tableQueryResult.expandable('instance')) $tableQueryResult.expandable('destroy');
        $tableQueryResult.expandable({
            toggleCallback: function (e) {
                $(e.target.closest('td').siblings('.showDetail')[0]).click();
                expandingItem = e.target;
            },
            thRowSpan: 2
        });
    }
    self.search = function (params, callback) {
        base._get('Report/QueryRisk?' + $.param(utils.getCleanedEmpty(params), true), {}, function (result) {
            self.queried(params);
            self.setUrl(params);
            self.fill(result);
            if (callback) {
                callback();
            }
            _initializeExpandable();
        });
    };
    self.fill = function (result) {
        var list = $.map(result.Data.list, function (r) {
            return $.extend(r, {
                isShowDetails: ko.observable(false)
            });
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
};
