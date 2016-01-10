var GMK = GMK || {};
GMK.Company = GMK.Company || {};
GMK.Company.start = function (route, element, success) {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        commonModels.AllCreditRatings = [];
        GMK.Features.FeatureBase._get('CreditRating/ListAllCreditRatings', {}, function (result) {
            commonModels.AllCreditRatings = result.Data;
            callback();
        });
        commonModels.findCreditRating = function (id) {
            var result = commonModels.findById(commonModels.AllCreditRatings, id);
            return result ? result.name || '' : '';
        };
        function callback() {
            var corporationType = commonModels.Enums.CorporationTypeFlag;
            var typeOptions = $.grep(commonModels.EnumOptions.CorporationTypeFlag, function (r) {
                return [corporationType.Client, corporationType.Broker, corporationType.Logistics, corporationType.Bank, corporationType.Exchange].indexOf(r.value) > -1;
            });
            if (route.action === 'Groups') {
                commonModels.registerQueryFormEvent();
                var viewModel = new GMK.Company.GroupsViewModel(commonModels, route, {
                    typeOptions: typeOptions,
                    searchUrl: route.baseUrl + 'ListGroup',
                    deleteUrl: route.baseUrl + 'Delete',
                    isCompanyCreditEditableUrl: route.baseUrl + 'IsCompanyCreditEditable',
                    creditUrl: route.creditUrl
                });
                viewModel.initialize(function () {
                    ko.applyBindings(viewModel, element);
                    if (success) {
                        success();
                    }
                });
            } else if (route.action === 'Details') {
                var viewModel = new GMK.Company.DetailsViewModel(commonModels, route, {
                    typeOptions: typeOptions,
                    getUrl: route.baseUrl + 'Get',
                    deleteUrl: route.baseUrl + 'Delete',
                    indexUrl: route.baseUrl + 'Index',
                    groupsUrl: route.baseUrl + 'ListGroups'
                });
                viewModel.initialize(function () {
                    ko.applyBindings(viewModel, element);
                    if (success) {
                        success();
                    }
                });
            } else if (route.action === 'Create') {
                var viewModel = new GMK.Company.CreateViewModel(commonModels, route, {
                    typeOptions: typeOptions,
                    groupsUrl: route.baseUrl + 'ListGroups',
                    detailsUrl: route.baseUrl + 'Details',
                    saveUrl: route.baseUrl + 'Create',
                    indexUrl: route.baseUrl + 'Index'
                });
                viewModel.initialize();
                ko.applyBindings(viewModel, element);
                if (success) success();
            } else if (route.action === 'Edit') {
                var viewModel = new GMK.Company.EditViewModel(commonModels, route, {
                    typeOptions: typeOptions,
                    groupsUrl: route.baseUrl + 'ListGroups',
                    getUrl: route.baseUrl + 'Get',
                    detailsUrl: route.baseUrl + 'Details',
                    saveUrl: route.baseUrl + 'Edit',
                    indexUrl: route.baseUrl + 'Index'
                });
                window.vm = viewModel;
                viewModel.initialize();
                ko.applyBindings(viewModel, element);
                if (success) success();
            } else if (route.action == 'EditCompanyBusiness') {
                var viewModel = new GMK.Company.EditCompanyBusinessViewModel(commonModels, route, {
                    getUrl: route.baseUrl + 'Get',
                    saveUrl: route.baseUrl + 'EditCompanyBusiness'
                });
                window.vm = viewModel;
                viewModel.initialize();
                ko.applyBindings(viewModel, element);
                if (success) success();
            } else if (route.action === 'BatchImport') {
                var viewModel = new GMK.Company.BatchImportCompanyViewModel(commonModels, {
                    typeOptions: typeOptions,
                    saveUrl: 'Company/SaveImportedClients'
                });
                viewModel.ExportedClientsElem = $('#ImportedClients');
                viewModel.ImportedClients.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
                viewModel.ExportedClientsElem.handsontable({
                    data: viewModel.ImportedClients,
                    startRows: 1,
                    startCols: 20,
                    maxCols: 20,
                    minSpareRows: 1,
                    rowHeaders: true,
                    colHeaders: true,
                    contextMenu: true,
                    stretchH: 'all',
                });
                viewModel.ExportedClientsElem.handsontable('getInstance').addHook('afterChange', function (changes) {
                    $.each(changes, function (i, item) {
                        if (item[1] >= 2) {
                            var totalCount = viewModel.ExportedClientsElem.handsontable('countRows') - 2;
                            viewModel.TotalClients(totalCount);
                            return false;
                        }
                    });
                });
                ko.applyBindings(viewModel);
                viewModel.initialize();
            } else if (route.action == 'CreditRatingDetail') {
                var vm = new GMK.Company.CompanyCreditRatingDetailViewModel(commonModels, {
                    getCompanyRatingStructureUrl: 'Company/GetCompanyRatingStructure'
                }, {
                    companyId: route.companyId
                });
                ko.applyBindings(vm);
                vm.initialize();
            }
        }
    });
};
GMK.Company.GroupsViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    self.values = route.values;
    self.typeOptions = options.typeOptions;
    var base = GMK.Features.FeatureBase;
    self.toquery = ko.mapping.fromJS(route.values.query);
    self.queried = ko.observable(ko.mapping.toJS(self.toquery));
    self.resultPagination = ko.observable({});
    self.setUrl = function () {
        var urlParams = utils.getCleanedEmpty(self.queried());
        var url = location.pathname + '?' + $.param(urlParams, true) + location.hash;
        history.replaceState(null, null, url);
    };
    self.items = ko.observableArray();
    self.initialize = function (callback) {
        var params = ko.mapping.toJS(self.toquery);
        self.search(params, callback);
    };
    self.onSearch = function () {
        if (self.toquery.Pagination && self.toquery.Pagination.CurrentPage) {
            self.toquery.Pagination.CurrentPage(1);
        }
        var params = ko.mapping.toJS(self.toquery);
        self.search(params);
    };
    self.search = function (params, callback) {
        base._get('Company/ListGroup', utils.getCleanedEmpty(params), function (result) {
            self.queried(params);
            self.setUrl();
            self.fill(result);
            if (callback) {
                callback();
            }
        });
    };
    function _getSelectedType(v) {
        var temp = [], corporationType = commonModels.Enums.CorporationTypeFlag;
        for (var enumName in corporationType) {
            if (corporationType[enumName] & v) temp.push(corporationType._Notes[corporationType[enumName]]);
        }
        return temp.join(', ');
    }
    self.fill = function (result) {
        var items = result.Data.list;
        $.each(items, function (i, item) {
            item.ComputedType = _getSelectedType(item.Type);
            if (item.Companies) {
                $.each(item.Companies, function (j, elem) {
                    elem.ComputedType = _getSelectedType(elem.Type);
                });
            }
        });
        self.items(items);
        self.resultPagination(result.Data.pagination);
        base._pagination($(self.values.pager), +self.resultPagination().PageCount, +self.resultPagination().TotalCount, +self.queried().Pagination.CurrentPage, self.changePage, +self.resultPagination().PageSize);
        _initializeExpandable();
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
    self.reload = function (callback) {
        var params = self.queried();
        self.search(params, callback);
    };
    self.onDelete = function (item) {
        base._delete(options.deleteUrl, {
            id: item.WFCompanyId
        }, function () {
            self.reload();
        });
    };
    self.onEditCredit = function (item) {
        base._get(options.isCompanyCreditEditableUrl, { id: item.WFCompanyId }, function (result) {
            if (result.status) {
                window.location.href = options.creditUrl + '?companyId=' + item.WFCompanyId;
            } else {
                alert(result.message);
            }
        });
    };
    self.computeCommodityTexts = function (customerCommodities) {
        var commodityIds = $.map(customerCommodities || [], function (r) {
            return r.WFCommodityId;
        });
        return $.map($.grep(commonModels.AllCommodities, function (r) {
            return $.inArray(r.id, commodityIds) !== -1;
        }), function (r) {
            return r.name;
        }).join(', ');
    };
    function _initializeExpandable() {
        var $divQueryResult = $('#divQueryResult');
        if ($divQueryResult.expandable('instance')) $divQueryResult.expandable('destroy');
        $divQueryResult.expandable({
            type: 'row',
            toggleCallback: function (e) {
                expandingItem = e.target;
            }
        });
    }
};
GMK.Company.DetailsViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    self.typeOptions = options.typeOptions;
    var base = GMK.Features.FeatureBase;
    self.id = route.values.id;
    self.item = {};
    self.item.CommodityIds = ko.observable();
    function _getSelectedType(v) {
        var temp = [], corporationType = commonModels.Enums.CorporationTypeFlag;
        for (var enumName in corporationType) {
            if (corporationType[enumName] & v) temp.push(corporationType._Notes[corporationType[enumName]]);
        }
        return temp.join(', ');
    }
    self.initialize = function (callback) {
        base._get(options.getUrl, { id: self.id }, function (result) {
            if (result.Data.WFCompanyBankInfoes && result.Data.WFCompanyBankInfoes.length) {
                $.each(result.Data.WFCompanyBankInfoes, function (i, item) {
                    var departments = '';
                    if (item.WFCompanyBankInfoCommodityAccountEntities && item.WFCompanyBankInfoCommodityAccountEntities.length) {
                        departments = $.map(item.WFCompanyBankInfoCommodityAccountEntities, function (item) {
                            var business = commonModels.findById(commonModels.AllBusinesses, item.WFBusinessId);
                            return business != null ? business.text : "";
                        }).join('； ');
                    }
                    item.Departments = departments;
                });
            }
            $.extend(self.item, ko.mapping.fromJS(result.Data));
            self.item.ComputedType = _getSelectedType(self.item.Type());
            self.item.GroupName = ko.observable();
            if (result.Data.GroupId) {
                base._get(options.groupsUrl, {}, function (data) {
                    self.item.GroupName($.grep(data, function (elem) {
                        return elem.id == result.Data.GroupId;
                    })[0].name);
                });
            }
            if (callback) {
                callback();
            }
        });
    };
};


var OnSetCompanyBusinessDone = "companyBusinessesHasSeted";
GMK.Company.CreateViewModel = function (commonModels, route, options) {
    route.values.newBank.WFCommodityAccountEntityIds = [];
    var self = this;
    self.commonModels = commonModels;
    self.typeOptions = options.typeOptions;
    self.groups = ko.observableArray();
    var base = GMK.Features.FeatureBase;
    self.item = new GMK.Company.ItemViewModel(route.values.newItem, commonModels, route.values.isGroup);
    self.businessIds = ko.observableArray();
    self.initialize = function () {
        base._get(options.groupsUrl, {}, function (data) {
            self.groups(data);
        });

        self.jstreeModel.initialize();
    };
    self.onAddBank = function () {
        self.item.WFCompanyBankInfoes.push(ko.mapping.fromJS(route.values.newBank));
    };
    self.onRemoveBank = function (bank) {
        self.item.WFCompanyBankInfoes.remove(bank);
    };
    self.selectedType = ko.observableArray();

    self.onSave = function () {
        var business = self.businessIds();
        self.item.WFCompanyBusinesses.removeAll();
        self.item.WFCompanyBusinesses($.map(business, function (item) {
            return { WFBusinessId: item };
        }));

        var plainItem = self.item.toJS();
        if (self.selectedType() && self.selectedType().length) {
            plainItem.Type = 0;
            $.each(self.selectedType(), function (i, v) {
                plainItem.Type |= v;
            });
        } else {
            plainItem.Type = null;
        }

        base._postThenBack(options.saveUrl, plainItem);
    };
    self.matchGroup = function (term, text, option) {
        term = Select2.util.stripDiacritics('' + term).toUpperCase();
        var result = Select2.util.stripDiacritics('' + text).toUpperCase().indexOf(term) >= 0;
        if (result) return result;
        $.each(self.groups(), function (i, item) {
            if (item.name == text) {
                $.each(item.subcorporations, function (j, elem) {
                    if (Select2.util.stripDiacritics('' + elem.name).toUpperCase().indexOf(term) >= 0) {
                        result = true;
                        return false;
                    }
                });
                return false;
            }
        });
        return result;
    };

    self.jstreeModel = new JsTree.Business.Model(commonModels, "jstree_div");
    self.jstOnShow = function () {
        if (self.item.WFCompanyBankInfoes() != null) {
            var bankBusinessIds = getBankBusinessIds();
            self.jstreeModel.onDisable(bankBusinessIds);
        }
        return self.jstreeModel.onShow(self.businessIds());
    };
    self.jstOnCheck = function () {
        self.jstreeModel.onSave(function () {
            var needDoubleCheck = false;
            //if (self.item.WFCompanyBankInfoes() != null) {
            //    var bankBusinessIds = getBankBusinessIds();
            //    if (!isSubsetOfCompany(self.jstreeModel.getSelected(), bankBusinessIds)) {
            //        needDoubleCheck = true;
            //        confirm('<span class="text-danger">当前设置取消了一部分银行信息中已选中的业务信息，如果确认当前设置将会同步移除银行信息中对应已选中的业务信息。确认使用当前设置？</span>', function () {
            //            self.jstOnCancel();
            //            $('#jstree_div').closest('.modal').modal('hide');
            //        });
            //    }
            //}
            if (!needDoubleCheck) {
                self.jstSave();
            }
        });
    };
    self.jstSave = function () {
        self.businessIds(self.jstreeModel.getSelected());
        $('#jstree_div').closest('.modal').modal('hide');
        PubSub.publish(OnSetCompanyBusinessDone, {
            ids: self.jstreeModel.getSelected(),
        });
    };
    self.jstOnCancel = function () {
        self.jstreeModel.onCancel();
    };

    function getBankBusinessIds() {
        var bankBusinessIds = [];
        $.each(self.item.WFCompanyBankInfoes(), function (j, bank) {
            if (bank.WFCommodityAccountEntityIds() != null) {
                $.each(bank.WFCommodityAccountEntityIds(), function (j, id) {
                    if ($.inArray(id, bankBusinessIds) < 0) {
                        bankBusinessIds.push(id);
                    }
                });
            }
        });
        return bankBusinessIds.getUnique();
    }
};
GMK.Company.EditViewModel = function (commonModels, route, options) {
    route.values.newBank.WFCommodityAccountEntityIds = null;
    var self = this;
    self.commonModels = commonModels;
    self.typeOptions = options.typeOptions;
    var base = GMK.Features.FeatureBase;
    if (!route.values.isGroup) {
        self.jstreeModel = new JsTree.Business.Model(commonModels, "jstree_div");
        self.jstreeModel = new JsTree.Business.Model(commonModels, "jstree_div");
        self.jstOnShow = function () {
            if (self.item.WFCompanyBankInfoes() != null) {
                var bankBusinessIds = getBankBusinessIds();
                self.jstreeModel.onDisable(bankBusinessIds);
            }
            return self.jstreeModel.onShow(self.businessIds());
        };
        self.jstOnCheck = function () {
            self.jstreeModel.onSave(function () {
                var needDoubleCheck = false;
                //if (self.item.WFCompanyBankInfoes() != null) {
                //    var bankBusinessIds = getBankBusinessIds();
                //    if (!isSubsetOfCompany(self.jstreeModel.getSelected(), bankBusinessIds)) {
                //        needDoubleCheck = true;
                //        confirm('<span class="text-danger">当前设置取消了一部分银行信息中已选中的业务信息，如果确认当前设置将会同步移除银行信息中对应已选中的业务信息。确认使用当前设置？</span>', function () {
                //            self.jstOnCancel();
                //            $('#jstree_div').closest('.modal').modal('hide');
                //        });
                //    }
                //}
                if (!needDoubleCheck) {
                    self.jstSave();
                }
            });
        };
        self.jstSave = function () {
            self.businessIds(self.jstreeModel.getSelected());
            $('#jstree_div').closest('.modal').modal('hide');
            PubSub.publish(OnSetCompanyBusinessDone, {
                ids: self.jstreeModel.getSelected(),
            });
        };
        self.jstOnCancel = function () {
            self.jstreeModel.onCancel();
        };

        function getBankBusinessIds() {
            var bankBusinessIds = [];
            $.each(self.item.WFCompanyBankInfoes(), function (j, bank) {
                if (bank.WFCommodityAccountEntityIds() != null) {
                    $.each(bank.WFCommodityAccountEntityIds(), function (j, id) {
                        bankBusinessIds.push(id + '');
                    });
                }
            });            
            return bankBusinessIds.getUnique();
        }
    }

    self.id = route.values.id;
    self.businessIds = ko.observableArray();
    self.item = new GMK.Company.ItemViewModel(route.values.newItem, commonModels, route.values.isGroup);
    self.groups = ko.observableArray();
    self.companyList = route.values.companyList;
    self.initialize = function () {
        if (route.values.isGroup !== true) {
            base._get(options.groupsUrl, {}, function (data) {
                self.groups(data);
                callback();
            });
        } else {
            callback();
        }
        function callback() {
            if (self.id) {
                base._get(options.getUrl, { id: self.id }, function (result) {
                    if (result.Data.Companies && result.Data.Companies.length) {
                        result.Data.Companies = $.map(result.Data.Companies, function (item) {
                            return item.WFCompanyId;
                        });
                    }
                    self.businessIds($.map(result.Data.WFCompanyBusinesses, function (item) {
                        return item.WFBusinessId + '';
                    }));
                    if (result.Data.Type) {
                        var corporationType = commonModels.Enums.CorporationTypeFlag;
                        for (var enumName in corporationType) {
                            if (result.Data.Type & corporationType[enumName]) self.selectedType.push(corporationType[enumName]);
                        }
                    }

                    if (!route.values.isGroup) {
                        self.jstreeModel.initialize();
                        PubSub.publish(OnSetCompanyBusinessDone, {
                            ids: self.businessIds(),
                        });
                    }
                    self.item.fromJS(result.Data);                    
                });
            } else {
                if (route.values.isGroup === true) self.item.Type(commonModels.Enums.CorporationTypeFlag.Group);
            }
        }
    };
    self.onAddBank = function () {
        self.item.WFCompanyBankInfoes.push(ko.mapping.fromJS(route.values.newBank));
    };
    self.onRemoveBank = function (bank) {
        self.item.WFCompanyBankInfoes.remove(bank);
    };
    self.selectedType = ko.observableArray();

    self.onSave = function () {
        var business = self.businessIds();
        self.item.WFCompanyBusinesses.removeAll();
        self.item.WFCompanyBusinesses($.map(business, function (item) {
            return { WFBusinessId: item, WFCompanyId: self.item.WFCompanyId() };
        }));

        var plainItem = self.item.toJS();
        if (!(plainItem.Type & commonModels.Enums.CorporationTypeFlag.Group)) {
            if (self.selectedType() && self.selectedType().length) {
                plainItem.Type = 0;
                $.each(self.selectedType(), function (i, v) {
                    plainItem.Type |= v;
                });
            } else {
                plainItem.Type = commonModels.Enums.CorporationTypeFlag.Group;
            }
        }
        if (plainItem.Companies && plainItem.Companies.length) {
            plainItem.Companies = $.map(plainItem.Companies, function (id) {
                return {
                    WFCompanyId: id
                };
            });
        }
        
            base._postThenBack(options.saveUrl, plainItem);
        
    };
    self.matchGroup = function (term, text, option) {
        term = Select2.util.stripDiacritics('' + term).toUpperCase();
        var result = Select2.util.stripDiacritics('' + text).toUpperCase().indexOf(term) >= 0;
        if (result) return result;
        $.each(self.groups(), function (i, item) {
            if (item.name == text) {
                $.each(item.subcorporations, function (j, elem) {
                    if (Select2.util.stripDiacritics('' + elem.name).toUpperCase().indexOf(term) >= 0) {
                        result = true;
                        return false;
                    }
                });
                return false;
            }
        });
        return result;
    };
};
GMK.Company.BatchImportCompanyViewModel = function (models, options) {
    var self = $.extend(this, models);
    self.models = models;
    self.typeOptions = options.typeOptions;
    var base = GMK.Features.FeatureBase;

    function viewModel() {
        var vm = this;
        vm.list = ko.observableArray();
        vm.selectedItems = ko.observable(0);
        var changedData = {
            isChanged: ko.observable(false),
            trigger: function () {
                var groupSize = 3;
                var self = this;
                if (self.isChanged()) return;
                self.isChanged(true);
                function _setIfChanged(row, col, newVal) {
                    if (vm.ExportedClientsElem.handsontable('getDataAtCell', row, col) != newVal) {
                        vm.ExportedClientsElem.handsontable('setDataAtCell', row, col, newVal);
                    }
                }
                function _runer() {
                    for (var i = 1, items = vm.TotalClients, length = items.length - 1 ; i < length;) {
                        var batch = Math.min(groupSize, length - i - 1) + 1;
                        (function (j, b) {
                            setTimeout(function () {
                                for (var m = 0; m < b; m++, j++) {
                                    if (j == (length - 1)) self.onComplete();
                                }
                            }, 0);
                        })(i, batch);
                        i = i + batch;
                    }
                }
            },
            onComplete: function () {
                this.isChanged(false);
            }
        };
        vm.changedData = changedData;
        vm.ClientType = ko.observable(0);
        vm.CommodityIds = ko.observableArray();
        vm.TotalClients = ko.observable(0);
        vm.ImportedClients = [['等级', '公司名称', '公司简称', '法人姓名', '公司类型', '成立日期', '注册资本', '实际注册资本', '税号', '开户银行', '开户行账号', '汇款银行', '汇款行账号', '办公地址', '注册地址', '电话', '传真', '英文名', '英文简称', '备注']];

        vm.fill = function (data) {
            $.each(data, function (i, item) {
                item.isSelected = ko.observable(true);
                item.isVisible = ko.observable(true);
            });
            vm.list(data);
        }
    }

    viewModel.call(this);

    self.onSave = function () {
        base._save(options.saveUrl, { data: self.ImportedClients, commodityIds: self.CommodityIds, clientType: self.ClientType });
    };

    self.initialize = function () {
    }
};
GMK.Company.ItemViewModel = function (plainItem, commonModels, isGroup) {
    _setCommodityAccountEntity(plainItem);
    var self = $.extend(this, ko.mapping.fromJS(plainItem));
    self.fromJS = function (plainItem) {
        _setCommodityAccountEntity(plainItem);
        ko.mapping.fromJS(plainItem, self);
    };
    self.toJS = function () {
        var result = ko.mapping.toJS(self);
        $.each(result.WFCompanyBankInfoes, function (i, bank) {
            if (!bank.WFCommodityAccountEntityIds || !bank.WFCommodityAccountEntityIds.length) return;
            bank.WFCommodityAccountEntityIds = $.grep(bank.WFCommodityAccountEntityIds, function (item) {
                return !!item;
            });
            bank.WFCompanyBankInfoCommodityAccountEntities = $.map(bank.WFCommodityAccountEntityIds, function (commodityAccountEntityid) {
                return { WFBusinessId: commodityAccountEntityid };
            });
            delete bank.WFCommodityAccountEntityIds;
        });
        return result;
    };
    function _setCommodityAccountEntity(plainItem) {
        $.each(plainItem.WFCompanyBankInfoes, function (i, bank) {
            bank.WFCommodityAccountEntityIds = bank.WFCompanyBankInfoCommodityAccountEntities && bank.WFCompanyBankInfoCommodityAccountEntities.length ? $.map(bank.WFCompanyBankInfoCommodityAccountEntities, function (item) { return item.WFBusinessId; }) : [];
            if (bank.WFCompanyBankInfoCommodityAccountEntities) delete bank.WFCompanyBankInfoCommodityAccountEntities;
        });
    }
    if (!isGroup) {
        self.jstreeModel = new JsTree.Business.Model(commonModels, "jstree_div_bank");
        self.jstOnShow = function (index, data, e) {
            self.jstreeModel.bindModel = {
                bank: data,
                index: index
            };
            return self.jstreeModel.onShow(data.WFCommodityAccountEntityIds());
        };
        self.jstOnSave = function (companyModel, e) {
            self.jstreeModel.onSave(function () {
                var index = self.jstreeModel.bindModel.index;
                if (self.WFCompanyBankInfoes().length >= index + 1)
                    self.WFCompanyBankInfoes()[index].WFCommodityAccountEntityIds(self.jstreeModel.getSelected());
                $('#jstree_div_bank').closest('.modal').modal('hide');
            });
        };
        self.jstOnCancel = function () {
            self.jstreeModel.onCancel();
        };

        PubSub.subscribe(OnSetCompanyBusinessDone, function (msg, data) {
            if (data.ids) { //根据客户级别的业务信息刷新银行级别的业务信息列表
                self.jstreeModel.onDestroy();
                self.jstreeModel.initialize(null, _getBussinesSource(data.ids));
            }
        });
        function _getBussinesSource(ids) {
            var data = $.grep(commonModels.AllBusinesses, function (r) {
                return $.inArray(r.id + '', ids) != -1;
            });
            return data;
        }
    }

};
GMK.Company.CompanyCreditRatingDetailViewModel = function (commonModels, route, options) {
    var self = this;
    var base = GMK.Features.FeatureBase;
    this.details = ko.observable();
    this.initialize = function () {
        base._get(route.getCompanyRatingStructureUrl, {
            id: options.companyId
        }, function (data) {
            var item = data.data;
            _convertToTree(item.details);
            self.details(item.details[0]);
            $('#sample').treeview({
                showTags: true,
                tagTemplate: '<span class="tree-node-tag-col1">{1}</span><span class="tree-node-tag-col1">{0}</span>',
                renderTag: function (template, tag) {
                    return template.format(tag[0] || '--', tag[1] || '--');
                },
                data: self.details()
            });
        });
    };

    function _convertToTree(details) {
        $.each(details, function (i, item) {
            item.text = _getText(item);
            makeObservable(item.buyDetail);
            makeObservable(item.saleDetail);
            item.tag = [item.buyDetail.oldDisplayValue, item.saleDetail.oldDisplayValue];
            _convertToTree(item.children);
        });
    }
    function makeObservable(detail) {
        if (!detail.oldDisplayValue) detail.oldDisplayValue = commonModels.findCreditRating(detail.oldValue);
        detail.newValue = ko.observable(detail.newValue);
    }
    function _getText(item) {
        var modificationTable = commonModels.Enums.ModificationTable;
        switch (item.buyDetail.tableType) {
            case modificationTable.WFCompany:
                return commonModels.findCustomer(item.buyDetail.objectId) || commonModels.findGroup(item.buyDetail.objectId);
                break;
            case modificationTable.WFCustomerCommodity:
                return commonModels.findCommodity(item.commodityId);
                break;
        }
    }
};
GMK.Company.EditCompanyBusinessViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.id = route.values.id;
    self.businesses = ko.observableArray();
    self.companyName = ko.observable();
    self.item = new GMK.Company.ItemViewModel(route.values.newItem, commonModels, true);
    self.initialize = function () {
        base._get(options.getUrl, { id: self.id }, function (result) {
            self.businesses($.map(result.Data.WFCompanyBusinesses, function (item) {
                return item;
            }));
            self.item.fromJS(result.Data);
        });
    };

    self.convertBusinessMessage = function (business) {
        var corporation = self.commonModels.findCorporation(business.CorporationId);
        var department = self.commonModels.findAccountingEntity(business.DepartmentId);
        var commodity = self.commonModels.findCommodity(business.WFCommodityId);
        var tradeType = (self.commonModels.Enums.SimpleTradeType.Domestic & business.TradeType) > 0 ? '内贸' : '外贸';
        if (corporation != null && corporation !== '') {
            corporation = corporation + ' - ';
        }

        if (department != null && department !== '') {
            department = department + ' - ';
        }

        if (commodity != null && commodity !== '') {
            commodity = commodity + ' - ';
        }

        return corporation + department + commodity + tradeType;
    };

    self.onSave = function () {
        self.item.WFCompanyBusinesses($.map(self.businesses(), function (item) {
            return item;
        }));
        base._postThenBack(options.saveUrl, self.item);
    };
};

function isSubsetOfCompany(companyIds, companyBankIds) {
    var result = true
    $.each(companyBankIds, function (i, companyBankId) {
        if ($.inArray(companyBankId + '', companyIds) < 0) {
            result = false;
            return;
        }
    });

    return result;
}