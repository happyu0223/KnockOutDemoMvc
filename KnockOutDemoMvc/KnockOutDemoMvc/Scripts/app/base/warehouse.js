var GMK = GMK || {};
GMK.Warehouse = GMK.Warehouse || {};
GMK.Warehouse.start = function (route, element, success) {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        if (route.action === 'Index') {
            var viewModel = new GMK.Warehouse.IndexViewModel(commonModels, route, {
                searchUrl: route.baseUrl + 'List',
                deleteUrl: route.baseUrl + 'Delete',
                reserveCardCodeUrl: route.baseUrl + 'ReserveCardCode',
                listCardCodeUrl: route.baseUrl + 'ListCardCode',
                getReservedCardCodeCountUrl: route.baseUrl + 'GetReservedCardCodeCount'
            });
            viewModel.initialize();
            ko.applyBindings(viewModel, element);
            ko.utils.InlineEditorInitialize(viewModel.onInlineEditorSave);
            viewModel.commonModels.registerQueryFormEvent();
        } else if (route.action === 'Create') {
            var viewModel = new GMK.Warehouse.CreateViewModel(commonModels, route, {
                indexUrl: route.baseUrl + 'Index',
                saveUrl: route.baseUrl + 'Create'
            });
            viewModel.initialize(function () {
                ko.applyBindings(viewModel, element);
            });
        } else if (route.action === 'Edit') {
            var viewModel = new GMK.Warehouse.EditViewModel(commonModels, route, {
                getUrl: route.baseUrl + 'Get',
                indexUrl: route.baseUrl + 'Index',
                saveUrl: route.baseUrl + 'Edit'
            });
            viewModel.initialize(function () {
                ko.applyBindings(viewModel, element);
            });
        } else if (route.action === 'Details') {
            var viewModel = new GMK.Warehouse.DetailsViewModel(commonModels, route, {
                getUrl: route.baseUrl + 'Get'
            });
            viewModel.initialize(function () {
                ko.applyBindings(viewModel, element);
            });
        }
    });
};

GMK.Warehouse.IndexViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.query = ko.mapping.fromJS(route.values.query);
    self.currQuery = ko.mapping.toJS(self.query);
    self.items = ko.observableArray();
    self.initialize = function () {
        self.onSearch();
    };
    self.onSearch = function () {
        self.currQuery = ko.mapping.toJS(self.query);
        base._post(options.searchUrl, self.currQuery, function (result) {
            self.fillItems(result);
        });
    };
    self.fillItems = function (result) {
        //$.each(result.Data.list, function (i, item) {
        //    item.Commodity = $.map(item.WFWarehouseBusinesses, function (r) {
        //        if (r.WFCommodity) {
        //            return commonModels.findCommodity(r.WFCommodity.WFCommodityId);
        //        }
        //    }).join(', ');
        //});
        self.items(ko.mapping.fromJS(result.Data.list)());
        base._paginate($(route.values.pager), result.Data.pagination, function () { return self.currQuery; }, options.searchUrl, self.fillItems);
    };
    self.onDelete = function (item) {
        base._delete(options.deleteUrl, {
            id: item.WFCompanyId()
        }, function () {
            self.items.remove(item);
        });
    };

    self.reserveCardCodeCount = ko.observable();
    self.note = ko.observable();
    self.isCardCodeListShow = ko.observable();
    self.cardCodeQuery = {
        dateRange: ko.observable(),
        isUsed: ko.observable()
    };
    self.unusedCardCodeCount = ko.observable(0);
    self.cardCodeList = ko.observableArray([]);
    self.onReserveCardCode = function () {
        base._post(options.reserveCardCodeUrl, {
            warehouseId: _currentWarehouseId,
            count: self.reserveCardCodeCount(),
            note: self.note(),
            warehouseId: _currentWarehouseId
        }, function () {
            self.unusedCardCodeCount(parseInt(self.unusedCardCodeCount(), 10) + parseInt(self.reserveCardCodeCount(), 10));
            self.isCardCodeListShow(true);
            clearQuery();
            self.onSearchCardCode();
        });
    };
    var _currentWarehouseId;
    self.onPreReserveCardCode = function (item) {
        _currentWarehouseId = item.WFCompanyId();
        _doGetReservedCardCodeCount(function (result) {
            self.reserveCardCodeCount('');
            self.note('');
            self.isCardCodeListShow(true);
            clearQuery();
            self.unusedCardCodeCount(result.data || 0);
            $('#ReserveCardCodeDialog').modal('show');
        });
    };
    $('#ReserveCardCodeDialog').on('show', function () {
        clearQuery();
        self.onSearchCardCode();
    });
    function _doGetReservedCardCodeCount(callback) {
        base._get(options.getReservedCardCodeCountUrl, {
            warehouseId: _currentWarehouseId,
            used: false
        }, callback);
    }
    function clearQuery() {
        self.cardCodeQuery.isUsed(false);
        self.cardCodeQuery.dateRange('');
    }
    self.onSearchCardCode = function () {
        var splittings = (self.cardCodeQuery.dateRange() || '').split(' - ');
        base._get(options.listCardCodeUrl, {
            warehouseId: _currentWarehouseId,
            startTime: splittings[0],
            endTime: splittings[1],
            used: self.cardCodeQuery.isUsed()
        }, function (result) {
            $.each(result.data, function (i, item) {
                item.createTime = utils.formatDate(item.createTime, 'YYYY-MM-DD');
                //item.used = item.used ? '是' : '否';
            });
            self.cardCodeList(result.data);
        });
    };
    self.onContinueReserveCardCode = function () {
        self.isCardCodeListShow(false);
    };
    self.onShowCardCodeHistory = function () {
        self.isCardCodeListShow(true);
    };

    // TODO: 用户必须拥有该仓库所有的business权限才能删除仓库 or 只要有其中一个就可以删除?
    self.hasCommodityPermission = function (item) {
        if (item.WFCompanyBusinesses() == null || item.WFCompanyBusinesses().length == 0) {
            return true;
        }

        var result = false;
        $.each(self.commonModels.UserCommodities, function (i, userCommodity) {
            if (result) {
                return;
            }

            var businessIds = $.map(userCommodity.businesses, function (r) {
                return r.id;
            });

            $.each(item.WFCompanyBusinesses(), function (j, companyBusiness) {
                result = $.inArray(companyBusiness.WFBusinessId(), businessIds) > -1;
                return;
            })
        })

        return result;
    };

    self.onInlineEditorSave = function (url, viewModel, newVal, callback, source, allBindings) {
        if (url.indexOf('SaveCardCode') >= 0) {
            var needSave = true;
            if (newVal == "" || newVal == null) {
                confirm('确定将当期卡号置空吗？', function () {
                    base._post(url, { id: viewModel.wfCardCodeInfoId, cardCode: newVal }, function (result) {
                        viewModel.cardCode = newVal;
                        if (allBindings) allBindings.text = newVal;
                        var $source = $(source);
                        $source.text(viewModel.cardCode);
                        callback();
                        self.onSearchCardCode();
                    });
                }, function () {
                    if (allBindings) allBindings.text = viewModel.cardCode;
                    var $source = $(source);
                    $source.text(viewModel.cardCode);
                    callback();
                });
            } else {
                base._post(url, { id: viewModel.wfCardCodeInfoId, cardCode: newVal }, function (result) {
                    viewModel.cardCode = newVal;
                    if (allBindings) allBindings.text = newVal;
                    var $source = $(source);
                    $source.text(viewModel.cardCode);
                    callback();
                    self.onSearchCardCode();
                });
            }
        }
    };

};
GMK.Warehouse.CreateViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.item = null;
    var corporationType = commonModels.Enums.CorporationTypeFlag;
    self.wareHouseTypeOptions = $.grep(commonModels.EnumOptions.CorporationTypeFlag, function (r) {
        return [corporationType.Warehouse, corporationType.Logistics].indexOf(r.value) > -1;
    });

    self.businessIds = ko.observableArray();

    self.initialize = function (callback) {
        self.item = ko.mapping.fromJS(route.values.item);
        if (self.item.Type() == null)
            self.item.Type(commonModels.Enums.CorporationTypeFlag.Warehouse);

        if (callback) {
            callback();
        }
        self.jstreeModel.initialize();
    };
    self.onAddBank = function () {
        self.item.WFCompanyBankInfoes.push(ko.mapping.fromJS(route.values.newBank));
    };
    self.onRemoveBank = function (bank) {
        self.item.WFCompanyBankInfoes.remove(bank);
    };
    self.onSave = function () {
        var business = self.businessIds();
        self.item.WFCompanyBusinesses.removeAll();
        self.item.WFCompanyBusinesses($.map(business, function (item) {
            return { WFBusinessId: item };
        }));
        var plainItem = ko.mapping.toJS(self.item);
        base._postThenBack(options.saveUrl, plainItem);
    };

    self.jstreeModel = new JsTree.Business.Model(commonModels, "jstree_div");
    self.jstOnShow = function () {
        return self.jstreeModel.onShow(self.businessIds());
    };
    self.jstOnSave = function () {
        self.jstreeModel.onSave(function () {
            self.businessIds(self.jstreeModel.getSelected());
        });
    };
    self.jstOnCancel = function () {
        self.jstreeModel.onCancel();
    };
};
GMK.Warehouse.EditViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.id = route.values.id;
    self.item = null;

    var corporationType = commonModels.Enums.CorporationTypeFlag;
    self.wareHouseTypeOptions = $.grep(commonModels.EnumOptions.CorporationTypeFlag, function (r) {
        return [corporationType.Warehouse, corporationType.Logistics].indexOf(r.value) > -1;
    });

    self.businessIds = ko.observableArray();
    self.initialize = function (callback) {
        base._get(options.getUrl, { id: self.id }, function (result) {
            self.item = ko.mapping.fromJS(result.Data);
            if (callback) {
                callback();
            }
            self.businessIds($.map(result.Data.WFCompanyBusinesses, function (item) {
                return item.WFBusinessId;
            }));
        });
        self.jstreeModel.initialize();
    };
    self.onAddBank = function () {
        self.item.WFCompanyBankInfoes.push(ko.mapping.fromJS(route.values.newBank));
    };
    self.onRemoveBank = function (bank) {
        self.item.WFCompanyBankInfoes.remove(bank);
    };
    self.onSave = function () {
        var business = self.businessIds();
        self.item.WFCompanyBusinesses.removeAll();
        self.item.WFCompanyBusinesses($.map(business, function (item) {
            return { WFBusinessId: item, WFCompanyId: self.item.WFCompanyId() };
        }));
        var plainItem = ko.mapping.toJS(self.item);
        base._postThenBack(options.saveUrl, plainItem);
    };

    self.jstreeModel = new JsTree.Business.Model(commonModels, "jstree_div");
    self.jstOnShow = function () {
        return self.jstreeModel.onShow(self.businessIds());
    };
    self.jstOnSave = function () {
        self.jstreeModel.onSave(function () {
            self.businessIds(self.jstreeModel.getSelected());
        });
    };
    self.jstOnCancel = function () {
        self.jstreeModel.onCancel();
    };
};

GMK.Warehouse.DetailsViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.id = route.values.id;
    self.item = null;
    self.allBusiness = ko.observableArray();

    var corporationType = commonModels.Enums.CorporationTypeFlag;
    self.wareHouseTypeOptions = $.grep(commonModels.EnumOptions.CorporationTypeFlag, function (r) {
        return [corporationType.Warehouse, corporationType.Logistics].indexOf(r.value) > -1;
    });
    self.initialize = function (callback) {
        base._get(options.getUrl, { id: self.id}, function (result) {
            result.Data.BusinessText = getBussines(result.Data.WFCompanyBusinesses);
            self.item = ko.mapping.fromJS(result.Data);
            if (callback) {
                callback();
            }
        });
    };

    function getBussines(data) {
        return $.map(data, function (item) {
            var business = commonModels.findById(commonModels.AllBusinesses, item.WFBusinessId);
            return business != null ? business.text : "";
        }).join('； ');
    }
};


