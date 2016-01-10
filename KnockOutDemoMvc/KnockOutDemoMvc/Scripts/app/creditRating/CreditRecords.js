/**
 * Created by amy on 2015-01-26.
 */

var GMK = GMK || {};
GMK.CreditRating = GMK.CreditRating || {};
GMK.CreditRating.CreditRecords = GMK.CreditRating.CreditRecords || {};

GMK.CreditRating.CreditRecords.start = function (viewRoute) {
    var $routeElem = $("#gmk-route"), route = {
        baseUrl: 'CreditRating/',
        action: $routeElem.data("action"),
        key: $routeElem.data("key")
    };
    GMK.Features.CommonModels.onReady(function (models) {
        if (route.action == 'List') {
            if (viewRoute) {
                var viewModel = new GMK.CreditRating.CreditRecords.ListViewModel(models, viewRoute, {
                    searchUrl: route.baseUrl + 'ListCreditRecords',
                    deleteUrl: route.baseUrl + 'DeleteCreditRating',
                    detailsUrl: route.baseUrl + 'GetCreditRating'
                });
                viewModel.initialize();
                ko.applyBindings(viewModel);
                viewModel.registerQueryFormEvent();
                ko.utils.InlineEditorInitialize(viewModel.onInlineEditorSave);
            }
        } else if (route.action == "Details") {
            if (viewRoute) {
                var viewModel = new GMK.CreditRating.CreditRecords.DetailsViewModel(models, viewRoute,
                    {});
                viewModel.initialize();
                ko.applyBindings(viewModel);
            }
        }
    });
};

GMK.CreditRating.CreditRecords.ListViewModel = function (models, route, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    self.paramToQuery = ko.mapping.fromJS(route.values.query);
    self.paramQueryed = ko.observable();
    self.resultPagination = ko.mapping.fromJS({ TotalCount: 0, PageCount: 1 });
    function viewModel() {
        var vm = this;
        vm.list = ko.observableArray();
        vm.fill = function (result) {
            vm.list.removeAll();
            for (var i = 0; i < result.Data.list.length; i++) {
                vm.list.push($.extend(result.Data.list[i], {
                    groupedDetails: ko.observableArray(),
                    isShown: ko.observable(false),
                    hasChildren: ko.observable(true),
                }));
            }
            _initializeExpandable();
            base._pagination($("#pager"), +vm.resultPagination.PageCount(), +vm.resultPagination.TotalCount(), +vm.paramQueryed().Pagination.CurrentPage, self.changePage, +result.Data.pagination.PageSize);
        };
    }
    viewModel.call(this);

    self.changePage = function (newPage, pageSize) {
        var params = self.paramQueryed();
        var currPageSize = +self.paramToQuery.Pagination.PageSize();
        var newPageSize = +pageSize || +params.Pagination.PageSize;
        params.Pagination.PageSize = newPageSize;
        self.paramToQuery.Pagination.PageSize(newPageSize);
        params.Pagination.CurrentPage = newPageSize === currPageSize ? +newPage || +params.Pagination.CurrentPage : 1;
        _search(params);
    };

    var expandingItem, $divQueryResult = $('#tableQueryResult');
    function _initializeExpandable() {
        if ($divQueryResult.expandable('instance')) $divQueryResult.expandable('destroy');
        $divQueryResult.expandable({
            toggleCallback: function (e) {
                expandingItem = e.target;
                self.loadDetails(self.list()[parseInt(e.target.closest('tr').attr('id').substr('state_'.length), 10)]);
            }
        });
    }

    function _search(param) {
        base._get(options.searchUrl, param, function (result) {
            param.Pagination.CurrentPage = result.Data.pagination.CurrentPage;
            self.paramQueryed(param);
            self.resultPagination.TotalCount(result.Data.pagination.TotalCount);
            self.resultPagination.PageCount(result.Data.pagination.PageCount);
            var urlParam = self.paramQueryed();
            utils.cleanEmpty(urlParam);
            history.replaceState(null, null, location.pathname + '?' + $.param(urlParam));

            self.fill(result);
        });
    };

    self.onSearch = function () {
        self.paramToQuery.Pagination.CurrentPage(1);
        var param = ko.mapping.toJS(self.paramToQuery);
        _search(param);
    };

    self.onDelete = function (item, event) {
        base._delete(options.deleteUrl, { id: item.WFCreditRatingId }, function () {
            var param = ko.mapping.toJS(self.paramToQuery);
            _search(param);
        });
    };

    self.loadDetails = function (item) {
        if (!item.loaded) {
            base._get('CreditRating/GetChildrenDetails', { id: item.WFCreditRatingId }, function (result) {
                item.groupedDetails(result.Data.list);

                if (item.groupedDetails().length == 0) {
                    item.hasChildren(false);
                } else {
                    item.hasChildren(true);
                }

                if (expandingItem) $divQueryResult.trigger('expanded.expandable', { target: expandingItem });
                expandingItem = null;
                item.isShown(true);
                item.loaded = true;
            });
        }
    };
    
    self.initialize = function () {
        var param = ko.mapping.toJS(self.paramToQuery);
        _search(param);
    };
}

GMK.CreditRating.CreditRecords.DetailsViewModel = function (models, route, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    function viewModel() {
        var vm = this;

        vm.item = ko.mapping.fromJS(route.data || {});
    }
    viewModel.call(this);

    self.initialize = function () {
    };
}