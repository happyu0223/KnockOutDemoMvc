var GMK = GMK || {};
GMK.User = GMK.User || {};
GMK.User.start = function (route, element, success) {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        var viewModel;
        if (route.action === 'Index') {
            viewModel = new GMK.User.IndexViewModel(commonModels, route, {
                searchUrl: 'User/ListAll',
                deleteUrl: 'User/Delete',
                rolesUrl: 'Role/ListAll'
            });
            commonModels.registerQueryFormEvent('.collapse-query');
        } else if (route.action === 'Create') {
            viewModel = new GMK.User.CreateViewModel(commonModels, route, {
                indexUrl: 'User/Index',
                saveUrl: 'User/Create',
                rolesUrl: 'Role/ListAll',
                officeAddressUrl: 'User/ListOfficeAddress',
            });
        } else if (route.action === 'Edit') {
            viewModel = new GMK.User.EditViewModel(commonModels, route, {
                getUrl: 'User/Get',
                indexUrl: 'User/Index',
                saveUrl: 'User/Edit',
                rolesUrl: 'Role/ListAll',
                officeAddressUrl: 'User/ListOfficeAddress',
            });
        }
        window.vm = viewModel;
        if (viewModel) {
            viewModel.initialize(function () {
                ko.applyBindings(viewModel, element);
                if (success) {
                    success();
                }
            });
        }
    });
};
GMK.User.ItemViewModel = function (plainItem, commonModels, getRoles) {
    var item = $.extend(this, ko.mapping.fromJS(plainItem));
    item.RoleIds = ko.observableArray($.map(item.WFUserRoles(), function (r) {
        return r.WFRoleInfoId();
    }));
    item.SelectedRoleTexts = ko.computed(function () {
        return $.map($.grep(getRoles(), function (r) {
            return $.inArray(r.WFRoleInfoId, item.RoleIds()) !== -1;
        }), function (r) {
            return r.Name;
        }).join(', ');
    });
    //item.AccountEntityIds = ko.observableArray($.map(item.WFUserAccountEntityInfoes(), function (r) {
    //    return r.WFAccountEntityId();
    //}));
    //item.SelectedAccountEntityTexts = ko.computed(function () {
    //    return $.map($.grep(commonModels.AccountingEntities, function (r) {
    //        return $.inArray(r.id, item.AccountEntityIds()) !== -1;
    //    }), function (r) {
    //        return r.name;
    //    }).join(', ');
    //});
    item.AvailableNotifyingAgentTypes = $.grep(commonModels.EnumOptions.NotifyingAgentType, function (r) {
        return r.value !== 0;
    });
    item.NotifyingAgentTypeValues = ko.computed({
        read: function () {
            return $.map($.grep(item.AvailableNotifyingAgentTypes, function (r) {
                return (item.NotifyingAgents() & r.value) !== 0;
            }), function (r) {
                return r.value;
            });
        },
        write: function (newVal) {
            item.NotifyingAgents((newVal || []).reduce(function (r, m) {
                return m | r;
            }, 0));
        }
    });
    item.NotifyingAgentTypeTexts = ko.computed(function () {
        return $.map($.grep(item.AvailableNotifyingAgentTypes, function (r) {
            return (item.NotifyingAgents() & r.value) !== 0;
        }), function (r) {
            return r.text;
        });
    });
    item.toJS = function () {
        var result = ko.mapping.toJS(item);
        result.WFUserRoles = $.map(item.RoleIds(), function (cId) {
            return { WFRoleInfoId: cId, WFUserId: result.WFUserId };
        });
        //result.WFUserAccountEntityInfoes = $.map(item.AccountEntityIds(), function (cId) {
        //    return { WFAccountEntityId: cId, WFUserId: result.WFUserId };
        //});
        return result;
    };
};
GMK.User.IndexViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.toquery = ko.mapping.fromJS(route.values.query);
    self.queried = ko.observable(ko.mapping.toJS(self.toquery));
    self.resultPagination = ko.observable({});
    self.setUrl = function () {
        var urlParams = utils.getCleanedEmpty(self.queried());
        var url = location.pathname + '?' + $.param(urlParams, true) + location.hash;
        history.replaceState(null, null, url);
    };
    self.loaded = ko.observable(false);
    self.items = ko.observableArray();
    self.allRoles = ko.observableArray();
    self.initialize = function (callback) {
        base._get(options.rolesUrl, null, function (rolesResult) {
            self.allRoles(rolesResult.Data);
            var params = ko.mapping.toJS(self.toquery);
            self.search(params, callback);
        });
    };
    self.onSearch = function (callback) {
        if (self.toquery.Pagination && self.toquery.Pagination.CurrentPage) {
            self.toquery.Pagination.CurrentPage(1);
        }
        var params = ko.mapping.toJS(self.toquery);
        self.search(params);
    };
    self.search = function (params, callback) {
        base._get('User/List', utils.getCleanedEmpty(params), function (result) {
            self.queried(params);
            self.setUrl();
            self.fill(result);
            self.loaded(true);
            if (callback) {
                callback();
            }
        });
    };
    self.fill = function (result) {
        var items = $.map(result.Data.list, function (r) {
            return new GMK.User.ItemViewModel(r, commonModels, self.allRoles);
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
        base._delete(options.deleteUrl, {
            id: item.WFUserId()
        }, function () {
            self.reload();
        });
    };
};
GMK.User.CreateViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.allRoles = ko.observableArray();
    self.allOfficeAddress = ko.observableArray();
    self.item = null;
    self.registerModel = ko.mapping.fromJS({
        Username: '',
        Password: '',
        ConfirmPassword: ''
    });
    self.loadOffice = function (callback) {
        base._get(options.officeAddressUrl, null, function (officeResult) {
            self.allOfficeAddress(officeResult.Data);
            if (callback) {
                callback();
            }
        });
    };
    self.loadRoles = function (callback) {
        base._get(options.rolesUrl, null, function (rolesResult) {
            self.allRoles(rolesResult.Data);
            if (callback) {
                callback();
            }
        });
    };

    self.initialize = function (callback) {
        self.loadRoles(function () {
            self.loadOffice(function () {
                self.item = new GMK.User.ItemViewModel(route.values.item, commonModels, self.allRoles);
                if (callback) {
                    callback();
                }
            });
        });
    };
    self.onSave = function (valid) {
        if (valid()) {
            var plainItem = self.item.toJS();
            var register = ko.mapping.toJS(self.registerModel);
            plainItem.LoginName = register.Username;
            plainItem.Password = register.Password;
            base._postThenBack(options.saveUrl, plainItem);
        }
    };
};
GMK.User.EditViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.username = route.values.username;
    self.item = null;
    self.allRoles = ko.observableArray();
    self.allOfficeAddress = ko.observableArray();
    self.loadOffice = function (callback) {
        base._get(options.officeAddressUrl, null, function (officeResult) {
            self.allOfficeAddress(officeResult.Data);
            if (callback) {
                callback();
            }
        });
    };
    self.loadRoles = function (callback) {
        if (route.values.isAccountProfile) {
            if (callback) {
                callback();
            }
        } else {
            base._get(options.rolesUrl, null, function (rolesResult) {
                self.allRoles(rolesResult.Data);
                if (callback) {
                    callback();
                }
            });
        }
    };
    self.findCorporation = commonModels.findCompanyShortName;
    self.initialize = function (callback) {
        self.loadRoles(function () {
            self.loadOffice(function () {
                var url = route.values.isAccountProfile ? 'Account/GetUserProfile' : options.getUrl;
                var params = route.values.isAccountProfile ? {} : { username: self.username };
                base._get(url, params, function (result) {
                    self.item = new GMK.User.ItemViewModel(result.Data, commonModels, self.allRoles);
                    if (callback) {
                        callback();
                    }
                });
            });
        });
    };
    self.onSave = function () {
        var plainItem = self.item.toJS();
        var priorities = {};
        $('.sortable > li').each(function (i) {
            priorities[$($(this).children('div.grid-column')[1]).data('id')] = i + 1;
        });
        plainItem.CorporationPriorities = priorities;
        var url = route.values.isAccountProfile ? 'Account/EditUserProfile' : options.saveUrl;

        base._postThenBack(url, plainItem);
    };
};


