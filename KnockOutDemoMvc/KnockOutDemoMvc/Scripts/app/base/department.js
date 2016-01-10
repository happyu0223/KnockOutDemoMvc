var GMK = GMK || {};
GMK.Department = GMK.Department || {};
GMK.Department.start = function (route, element, success) {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        var viewModel;
        if (route.action === 'Index') {
            viewModel = new GMK.Department.IndexViewModel(commonModels, route, {
            });
            commonModels.registerQueryFormEvent('.collapse-query');
        } else if (route.action === 'Create' || route.action === 'Edit') {
            viewModel = new GMK.Department.ItemViewModel(commonModels, route, {
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
GMK.Department.ViewModel = function (plainItem, commonModels, getRoles, getAccountEntities, getDepts) {
    var item = this;
    item.commodityIds = ko.observableArray();
    item.roleIds = ko.observableArray();
    item.accountEntityIds = ko.observableArray();
    item.toJS = function () {
        var result = ko.mapping.toJS(item);
        result.WFCommodityAccountEntities = $.map(item.commodityIds(), function (r) {
            return { WFCommodityId: r, WFAccountEntityId: result.WFAccountEntityId };
        });
        result.WFRoleAccountEntities = $.map(item.roleIds(), function (r) {
            return { WFRoleInfoId: r, WFAccountEntityId: result.WFAccountEntityId };
        });
        result.AccountEntities = $.map(item.accountEntityIds(), function (r) {
            return { AccountEntityId: r, DepartmentId: result.WFAccountEntityId };
        });
        return result;
    };
    item.fromJS = function (newPlainItem, option) {
        ko.mapping.fromJS(newPlainItem, option || {}, item);
        item.commodityIds($.map(newPlainItem.WFCommodityAccountEntities || [], function (r) {
            return r.WFCommodityId;
        }));
        item.roleIds($.map(newPlainItem.WFRoleAccountEntities || [], function (r) {
            return r.WFRoleInfoId;
        }));
        item.accountEntityIds($.map(newPlainItem.AccountEntities || [], function (r) {
            return r.AccountEntityId;
        }));
    };
    item.fromJS(plainItem);
    item.commodityTexts = ko.computed(function () {
        return $.map($.grep(commonModels.AllCommodities, function (r) {
            return $.inArray(r.id, item.commodityIds()) !== -1;
        }), function (r) {
            return r.name;
        });
    });
    item.roleTexts = ko.computed(function () {
        return $.map($.grep(getRoles(), function (r) {
            return $.inArray(r.id, item.roleIds()) !== -1;
        }), function (r) {
            return r.name;
        });
    });
    item.accountEntityTexts = ko.computed(function () {
        return $.map($.grep(getAccountEntities(), function (r) {
            return $.inArray(r.id, item.accountEntityIds()) !== -1;
        }), function (r) {
            return r.name;
        });
    });
};
GMK.Department.IndexViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    self.values = route.values;
    var base = GMK.Features.FeatureBase;
    self.toquery = ko.mapping.fromJS(route.values.query);
    self.queried = ko.observable(ko.mapping.toJS(self.toquery));
    self.resultPagination = ko.observable({});
    self.setUrl = function () {
        var urlParams = utils.getCleanedEmpty(self.queried());
        var url = location.pathname + '?' + $.param(urlParams, true) + location.hash;
        history.replaceState(null, null, url);
    };
    self.allRoles = ko.observableArray();
    self.allAccountEntities = ko.observableArray();
    self.availableDepartments = ko.observableArray();
    self.items = ko.observableArray();
    self.initialize = function (callback) {
        base._get('Department/ListRoles', {}, function (roleResult) {
            self.allRoles(roleResult.Data);
            base._get('Department/ListAccountEntities', {}, function (aeResult) {
                self.allAccountEntities(aeResult.Data);
                base._get('Department/ListWithParent', {}, function (dResult) {
                    self.availableDepartments(dResult.Data);
                    var params = ko.mapping.toJS(self.toquery);
                    self.search(params, callback);
                });
            });
        });
    };
    self.onSearch = function () {
        if (self.toquery.Pagination && self.toquery.Pagination.CurrentPage) {
            self.toquery.Pagination.CurrentPage(1);
        }
        var params = ko.mapping.toJS(self.toquery);
        self.search(params);
    };
    self.search = function (params, callback) {
        base._get('Department/List', utils.getCleanedEmpty(params), function (result) {
            self.queried(params);
            self.setUrl();
            self.fill(result);
            if (callback) {
                callback();
            }
        });
    };
    self.fill = function (result) {
        var items = $.map(result.Data.list, function (r) {
            return new GMK.Department.ViewModel(r, commonModels, self.allRoles, self.allAccountEntities, self.availableDepartments);
        });
        self.items(items);
        self.resultPagination(result.Data.pagination);
        base._pagination($('#pager'), +self.resultPagination().PageCount, +self.resultPagination().TotalCount, +self.queried().Pagination.CurrentPage, self.changePage, +self.resultPagination().PageSize);
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
        base._delete('Department/Delete', {
            id: item.WFAccountEntityId()
        }, function () {
            self.reload();
        });
    };
};
GMK.Department.ItemViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    self.values = route.values;
    var base = GMK.Features.FeatureBase;
    self.id = route.values.id;
    self.allRoles = ko.observableArray();
    self.allAccountEntities = ko.observableArray();
    self.availableDepartments = ko.observableArray();
    self.treeNodes = ko.observableArray();
    self.item = new GMK.Department.ViewModel(route.values.newItem, commonModels, self.allRoles, self.allAccountEntities, self.availableDepartments);
    self.disableProfit = ko.observable(false);
    self.disableVirtual = ko.observable(false);
    self.disableAccounting = ko.observable(false);
    self.initialize = function (callback) {
        base._get('Department/ListRoles', {}, function (roleResult) {
            self.allRoles(roleResult.Data);
            base._get('Department/ListAccountEntities', {}, function (aeResult) {
                self.allAccountEntities(aeResult.Data);
                base._get('Department/ListWithParent', {}, function (dResult) {
                    self.availableDepartments(dResult.Data);
                    self.treeRoot = self.genTree(self.availableDepartments());
                    var node = utils.find(self.availableDepartments(), function (r) {
                        return r.id === self.id;
                    });
                    if (node) {
                        var descendants = self.getDescendants(node);
                        self.availableDepartments(self.availableDepartments().filter(function (r) {
                            return descendants.indexOf(r) === -1
                        }));
                    }
                    self.treeNodes(self.listNodes(0, self.treeRoot, self.availableDepartments(), []));
                    self.loadItem(callback);
                });
            });
        });
    };
    self.loadItem = function (callback) {
        if (route.action === 'Create') {
            if (callback) {
                callback();
            }
        } else {
            base._get('Department/Get', { id: self.id }, function (result) {
                self.item.fromJS(result.Data);
                self.disableProfit(result.Data.IsProfit === true);
                self.disableVirtual(result.Data.IsVirtual === false);
                self.disableAccounting(result.Data.IsAccounting === true);
                if (callback) {
                    callback();
                }
            });
        }
    };
    self.genTree = function (nodes) {
        var rootNode = { children: [] };
        nodes.forEach(function (r) {
            r.children = [];
        });
        nodes.forEach(function (r) {
            r.parent = utils.find(nodes, function (r2) {
                return r2.id === r.parentId;
            }) || rootNode;
            r.parent.children.push(r);
        });
        return rootNode;
    };
    self.getDescendants = function (node) {
        return [node].concat(node.children.reduce(function (m, r) {
            return m.concat(self.getDescendants(r));
        }, []));
    };
    self.listNodes = function (level, parent, list, memo) {
        return parent.children.reduce(function (m, r) {
            if (list.indexOf(r) === -1) {
                return m;
            }
            r.level = level;
            r.text = Array(level + 1).join('　') + $.trim(r.name);
            m.push(r);
            return self.listNodes(level + 1, r, list, m);
        }, memo);
    };
    self.onSave = function () {
        var url = (route.action === 'Create' ? 'Department/Create' : 'Department/Edit');
        var plainItem = self.item.toJS();
        base._postThenBack(url, plainItem);
    };
};
