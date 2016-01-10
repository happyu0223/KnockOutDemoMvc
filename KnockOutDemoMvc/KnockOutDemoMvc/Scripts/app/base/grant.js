var GMK = GMK || {};
GMK.Grant = GMK.Grant || {};
GMK.Grant.start = function (route, element, success) {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        var viewModel;
        if (route.action === 'Index') {
            viewModel = new GMK.Grant.IndexViewModel(commonModels, route, {});
        } else if (route.action === 'Create' || route.action === 'Edit' || route.action === 'Details') {
            viewModel = new GMK.Grant.EditViewModel(commonModels, route, {});
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
GMK.Grant.ItemViewModel = function (plainItem, commonModels, route, getUsers, getRoles) {
    var item = this;
    item.availableApprovalGrantPermissionTypes = [commonModels.Enums.GrantPermissionType.Person, commonModels.Enums.GrantPermissionType.Department];
    item.getGrantContent = function () {
        return item.WFAuthorizationContents().reduce(function (m, r) {
            (m[r.ObjectType()] || []).push(r.ObjectId());
            return m;
        }, item.availableApprovalGrantPermissionTypes.reduce(function (m, r) {
            m[r] = ko.observableArray();
            return m;
        }, {}));
    };
    item.fromJS = function (data) {
        ko.mapping.fromJS(data, {}, item);
        item.grantContent = item.getGrantContent();
        if (route.action === 'Edit' && (item.grantContent[commonModels.Enums.GrantPermissionType.Person]().length !== 1 || !item.grantContent[commonModels.Enums.GrantPermissionType.Person]()[0])) {
            item.grantContent[commonModels.Enums.GrantPermissionType.Person]([data.AuthorizerId]);
        }
    };
    item.fromJS(plainItem);
    item.toJS = function () {
        var result = ko.mapping.toJS(item);
        result.WFAuthorizationContents = $.map(item.availableApprovalGrantPermissionTypes, function (r1) {
            return item.grantContent[r1]().map(function (r2) {
                return {
                    WFAuthorizationId: item.WFAuthorizationId(),
                    ObjectId: r2,
                    ObjectType: r1
                };
            });
        });
        return result;
    };
    item.findRoleName = function (roleId) {
        var role = utils.find(getRoles(), function (r) { return r.WFRoleInfoId == roleId; });
        return role && role.Name || '';
    };
    item.getUserText = function (user) {
        return user && (user.Name + ' (' + user.LoginName + ')') || '';
    };
    item.getUsersText = function (users) {
        return $.map(users, item.getUserText);
    };
    item.findUserName = function (userId) {
        return item.getUsersText($.grep(getUsers(), function (r) { return r.WFUserId == userId; }))[0] || '';
        //var user = utils.find(getUsers(), function (r) { return r.WFUserId == userId; });
        //return item.getUserText(user);
    };
    item.findUsersName = function (ids) {
        return item.getUsersText($.grep(getUsers(), function (r) { return (ids || []).indexOf(r.WFUserId) !== -1; }));
    };
    item.findDepartmentsName = function (ids) {
        return $.map($.grep(commonModels.AllBusinessDepartments, function (r) {
            return (ids || []).indexOf(r.id) !== -1;
        }), function (r) {
            return r.name;
        });
    };
    item.findContentText = function (objectType, objectIds) {
        return (objectType === commonModels.Enums.GrantPermissionType.Person ? item.findUsersName : item.findDepartmentsName)(objectIds);
    };
    item.findContentByType = function (t) {
        return item.findContentText(t, item.grantContent[t]());
    };
    item.grantorName = ko.computed(function () {
        return item.findUserName(item.AuthorizerId());
    });
    item.granteeName = ko.computed(function () {
        return item.findUserName(item.AuthorizeeId());
    });
    item.permissionName = ko.computed(function () {
        //return item.PermissionType() === commonModels.Enums.GrantPermissionType.User
        //    ? item.findUserName(item.PermissionId())
        //    : item.findRoleName(item.PermissionId());
    });
    item.availableGrantAuthorizationTypeOptions = ko.computed(function () {
        return $.grep(commonModels.EnumOptions.GrantAuthorizationType, function (r) {
            return $.inArray(r.value, route.values.userGrantAuthorizationTypes) !== -1;
        });
    });
    item.availableGrantPermissionTypeOptions = ko.computed(function () {
        var options = $.grep(commonModels.EnumOptions.GrantPermissionType, function (r) {
            if (item.Type() === commonModels.Enums.GrantAuthorizationType.Approval) {
                return item.availableApprovalGrantPermissionTypes.indexOf(r.value) !== -1;
                //return r.value === commonModels.Enums.GrantPermissionType.User;
            } else {
                return true;
            }
        });
        return options;
    });
    item.availableGranteeUsers = ko.computed(function () {
        return $.map($.grep(getUsers(), function (r) {
            return (!route.values.availableGranteeUserIds || $.inArray(r.WFUserId, route.values.availableGranteeUserIds) !== -1) && item.AuthorizerId() !== r.WFUserId && 'admin' !== r.LoginName;
        }), function (r) {
            return { value: r.WFUserId, text: item.getUserText(r) };
        });
    });
    item.availableGrantedUsers = ko.computed(function () {
        return $.map($.grep(getUsers(), function (r) {
            return !route.values.availableGrantedUserIds || $.inArray(r.WFUserId, route.values.availableGrantedUserIds) !== -1;
        }), function (r) {
            return { value: r.WFUserId, text: item.getUserText(r) };
        });
    });
    item.availableGrantedRoles = ko.computed(function () {
        return $.grep(getRoles(), function (r) {
            return !route.values.availableGrantedRoleIds || $.inArray(r.WFRoleInfoId, route.values.availableGrantedRoleIds) !== -1;
        });
    });
    //item.Type.subscribe(function (newVal) {
    //    if (!utils.find(item.availableGrantPermissionTypeOptions(), function (r) {
    //        return item.PermissionType() === r.value;
    //    })) {
    //        item.PermissionType((item.availableGrantPermissionTypeOptions()[0] || {}).value);
    //    }
    //});
};
GMK.Grant.IndexViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    self.values = route.values;
    var base = GMK.Features.FeatureBase;
    self.items = ko.observableArray();
    self.allUsers = ko.observableArray();
    self.allRoles = ko.observableArray();
    self.initialize = function (callback) {
        base._get('Grant/ListAllUsers', null, function (usersResult) {
            self.allUsers(usersResult.Data);
            base._get('Grant/ListAllRoles', null, function (rolesResult) {
                self.allRoles(rolesResult.Data);

                self.search(callback);
            });
        });
    };
    self.search = function (callback) {
        base._get('Grant/ListAll', {}, function (result) {
            var items = $.map(result.Data, function (r) {
                return new GMK.Grant.ItemViewModel(r, commonModels, route, self.allUsers, self.allRoles);
            });
            self.items(items);
            if (callback) {
                callback();
            }
        });
    };
    self.onDelete = function (item) {
        base._delete('Grant/Delete', {
            id: item.WFAuthorizationId()
        }, function () {
            self.items.remove(item);
        });
    };
};
GMK.Grant.EditViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    self.values = route.values;
    var base = GMK.Features.FeatureBase;
    self.isDetailsView = ko.observable(route.action === 'Details');
    self.allUsers = ko.observableArray();
    self.allRoles = ko.observableArray();
    self.item = new GMK.Grant.ItemViewModel(route.values.newItem, commonModels, route, self.allUsers, self.allRoles);
    self.initialize = function (callback) {
        base._get('Grant/ListAllUsers', null, function (usersResult) {
            self.allUsers(usersResult.Data);
            base._get('Grant/ListAllRoles', null, function (rolesResult) {
                self.allRoles(rolesResult.Data);

                self.loadItem(callback);
            });
        });
    };
    self.itemLoaded = ko.observable(false);
    self.loadItem = function (callback) {
        if (route.action === 'Create') {
            self.itemLoaded(true);
            if (callback) {
                callback();
            }
        } else {
            base._get('Grant/Get', { id: route.values.id }, function (result) {
                if (route.action === 'Edit' && !result.Data.Editable) {
                    location = 'Grant/Details/' + route.values.id;
                }
                self.item.fromJS(result.Data);
                self.itemLoaded(true);
                if (callback) {
                    callback();
                }
            });
        }
    };
    self.onSave = function () {
        var plainItem = self.item.toJS();
        var url = (route.action === 'Create' ? 'Grant/Create' : 'Grant/Edit');
        base._postThenBack(url, plainItem);
    };
};
