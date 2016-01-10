var GMK = GMK || {};
GMK.Brand = GMK.Brand || {};

GMK.Brand.start = function (route, element, success) {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        if (route.action === 'Index') {
            var viewModel = new GMK.Brand.IndexViewModel(commonModels, route, {
                searchUrl: route.baseUrl + 'List',
                deleteUrl: route.baseUrl + 'Delete'
            });
            viewModel.initialize(function () {
                ko.applyBindings(viewModel, element);
                viewModel.commonModels.registerQueryFormEvent();
                if (success) {
                    success();
                }
            });
        } else {
            var viewmodel = new GMK.Brand.ManageViewModel(commonModels, route, {
                getUrl: route.baseUrl + 'get',
                saveUrl: route.baseUrl + 'edit',
                indexUrl: route.baseUrl + 'index'
            });
            ko.applyBindings(viewmodel);
            viewmodel.initialize();
        }
    });
};

GMK.Brand.IndexViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.items = ko.observableArray();
    self.initialize = function (callback) {
        _search(callback);
    };
    self.onSearch = function () {
        _search();
    };
    function _search(param, callback) {
        if (!param) {
            param = utils.serialize('#searchForm .gmk-data-field');
        } else if ($.isFunction(param)) {
            callback = param;
            param = utils.serialize('#searchForm .gmk-data-field');
        }
        base._get(options.searchUrl, param, function (result) {
            self.fillItems(result);
            if (callback) callback();
        });
    };
    var pagination;
    self.fillItems = function (result) {
        self.items(result.Data.result);
        pagination = result.Data.pagination;
        base._paginate($(route.values.pager), result.Data.pagination, function () { return utils.serialize('#searchForm  .gmk-data-field'); }, options.searchUrl, self.fillItems);
    };
    self.onDelete = function (item) {
        base._delete(options.deleteUrl, {
            id: item.WFBrandId
        }, function () {
            var param = utils.serialize('#searchForm .gmk-data-field');
            param.pagination = pagination;
            _search(param);
        });
    };
};

GMK.Brand.ManageViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.initialize = function () {
        if (!route.id) return;
        base._get(options.getUrl, { id: route.id }, function (result) {
            utils.deserialize('#EditForm .gmk-data-field', result.Data.result);
        });
    };
    self.onSave = function () {
        base._postThenBack(options.saveUrl, $.extend(utils.serialize('#EditForm .gmk-data-field'), { WFBrandId: route.id }));
    };
};
