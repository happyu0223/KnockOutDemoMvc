var GMK = GMK || {};
GMK.Fees = GMK.Fees || {};
GMK.Fees.start = function (route, element, success) {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        if (route.action === 'Index') {
            commonModels.registerQueryFormEvent();
            var viewModel = new GMK.Fees.IndexViewModel(commonModels, route, {});
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
GMK.Fees.IndexViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    self.values = route.values;
    var base = GMK.Features.FeatureBase;
    self.items = ko.observableArray();
    self.toquery = ko.mapping.fromJS(route.values.query);
    self.queried = ko.observable({});
    self.query = {};
    (function (query) {
        query.types = [{
            text: '选择费用类型',
            FeeSysTypeType: null,
            FeeSysType: null,
            isCategory: false,
            level: 0,
            visible: true
        }].concat(_.flatten(_.map(commonModels.EnumOptions.CostFeeType, function (r1) {
            return [{
                text: r1.text,
                FeeSysTypeType: r1.value,
                FeeSysType: null,
                isCategory: true,
                level: 0,
                visible: true
            }].concat(_.map(_.filter(commonModels.AllFee, function (r2) {
                return r2.feeType === r1.value;
            }), function (r2, k, list) {
                return {
                    text: r2.name,
                    FeeSysTypeType: r1.value,
                    FeeSysType: r2.id,
                    isCategory: false,
                    level: 1,
                    visible: list.length !== 1
                };
            }));
        }), true));
        query.type = ko.computed({
            read: function () {
                return utils.find(query.types, function (r) {
                    return self.toquery.FeeSysType() === r.FeeSysType && (r.FeeSysType !== null || self.toquery.FeeSysTypeType() === r.FeeSysTypeType);
                }) || query.types[0];
            },
            write: function (newVal) {
                if (newVal.FeeSysTypeType == null) {
                    self.toquery.CustomerId(null);
                }
                self.toquery.FeeSysTypeType(newVal.FeeSysTypeType);
                self.toquery.FeeSysType(newVal.FeeSysType);
            }
        });
        query.onSelectType = function (r) {
            query.type(r);
        };
        query.typeHighlighted = ko.observable(true);
        query.typeHighlight = function () {
            query.typeHighlighted(true);
        };
        query.typeRemoveHighlight = function () {
            query.typeHighlighted(false);
        };
        query.type(query.type());
    })(self.query);
    self.generate = {};
    (function (generate) {
        generate.params = ko.mapping.fromJS({
            FeeSysType: route.values.query.FeeSysType,
            DateRange: route.values.query.DateRange,
            CustomerId: route.values.query.CustomerId,
            CommodityId: route.values.query.CommodityId
        });
        generate.types = $.grep(commonModels.AllFee, function (r) {
            return $.inArray(r.name, ['仓储费', '过户费']) !== -1;
        });
        generate.onGenerate = function () {
            var params = ko.mapping.toJS(generate.params);
            base._post('CostManagement/Generate', params, function (result) {
                $('#modal-generate').modal('hide');
                self.changePage();
            });
        };
    })(self.generate);
    self.setUrl = function (params) {
        var urlParams = utils.getCleanedEmpty(params);
        var url = location.pathname + '?' + $.param(urlParams);
        history.replaceState(null, null, url);
    };
    self.resultPagination = ko.observable({});
    self.resultSummary = ko.observable({});
    self.pageSummary = ko.computed(function () {
        return _.reduce(self.items(), function (m, r) {
            m.amount = utils.roundAmount(m.amount + utils.roundAmount(r.Amount()));
            return m;
        }, { amount: 0 });
    });
    self.search = function (params, callback) {
        base._get('CostManagement/List', params, function (result) {
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
            return ko.mapping.fromJS(r);
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
        if (route.values.isForContract) {
            self.query.contract = ko.observable();
            base._get('Contract/GetContractCode', { id: route.values.query.ContractId }, function (result) {
                self.query.contract({ ContractCode: result.Data });
            });
        }
        callback();
        var params = ko.mapping.toJS(self.toquery);
        self.search(params);
    };
};
