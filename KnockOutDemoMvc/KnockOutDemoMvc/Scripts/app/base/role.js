var GMK = GMK || {};
GMK.Role = GMK.Role || {};
GMK.Role.start = function (route, element, success) {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        var viewModel;
        if (route.action === 'Index') {
            viewModel = new GMK.Role.IndexViewModel(commonModels, route, {
                //searchUrl: 'Role/ListAll',
                deleteUrl: 'Role/Delete',
                faUrl: 'FunctionAccess/List'
            });
            commonModels.registerQueryFormEvent('.collapse-query');
        } else if (route.action === 'Create' || route.action === 'Edit') {
            viewModel = new GMK.Role.EditViewModel(commonModels, route, {
                getUrl: 'Role/Get',
                indexUrl: 'Role/Index',
                faUrl: 'FunctionAccess/List'
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
GMK.Role.ItemViewModel = function (plainItem, commonModels, getFas, getPosts, getDepts) {
    var item = this;
    //ko.mapping.fromJS(plainItem, {}, item);
    item.functionIds = ko.observableArray();
    item.businessIds = ko.observableArray();
    item.toJS = function () {
        var result = ko.mapping.toJS(item);
        result.WFRolePermissions = $.map(item.functionIds(), function (cId) {
            return { WFFunctionId: cId, WFRoleInfoId: item.WFRoleInfoId };
        });
        result.WFRoleBusinesses = $.map(item.businessIds(), function (cId) {
            return { WFBusinessId: cId, WFRoleInfoId: result.WFRoleInfoId };
        });
        return result;
    };
    item.fromJS = function (newPlainItem, option) {
        ko.mapping.fromJS(newPlainItem, option || {}, item);
        item.functionIds($.map(item.WFRolePermissions(), function (r) {
            return r.WFFunctionId();
        }));
        item.businessIds($.map(item.WFRoleBusinesses(), function (r) {
            return r.WFBusinessId();
        }));
    };
    item.fromJS(plainItem);
    //item.selectedFunctionTexts = ko.computed(function () {
    //    return $.map($.grep(getFas(), function (r) {
    //        return $.inArray(r.WFFunctionId, item.functionIds()) !== -1;
    //    }), function (r) {
    //        return r.Name;
    //    });
    //});

    item.selectedDepartment = ko.computed(function () {
        return utils.find(getDepts(), function (r) {
            return (item.WFDepartmentId && item.WFDepartmentId()) === r.id;
        });
    });
    item.selectedPost = ko.computed(function () {
        return utils.find(getPosts(), function (r) {
            return item.WFPostId() === r.WFPostId;
        });
    });
};
GMK.Role.IndexViewModel = function (commonModels, route, options) {
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
    self.allFas = ko.observableArray();
    self.allPosts = ko.observableArray();
    self.allDepartments = ko.observableArray();
    self.items = ko.observableArray();
    self.loaded = ko.observable(false);
    self.initialize = function (callback) {
        base._get('Role/ListDepartments', {}, function (deptResult) {
            self.allDepartments(deptResult.Data);
            base._get('Role/ListAllPost', {}, function (postResult) {
                self.allPosts(postResult.Data);
                //base._get(options.faUrl, null, function (faResult) {
                //    self.allFas(faResult.Data);
                var params = ko.mapping.toJS(self.toquery);
                self.search(params, callback);
                //});
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
        base._get('Role/List', utils.getCleanedEmpty(params), function (result) {
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
            return new GMK.Role.ItemViewModel(r, commonModels, self.allFas, self.allPosts, self.allDepartments);
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
            id: item.WFRoleInfoId()
        }, function () {
            self.reload();
        });
    };
};
GMK.Role.EditViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    self.values = route.values;
    var base = GMK.Features.FeatureBase;
    self.id = route.values.id;
    self.allFas = ko.observableArray();
    self.allPosts = ko.observableArray();
    self.allDepartments = ko.observableArray();
    self.allBusiness = ko.observableArray();
    self.item = new GMK.Role.ItemViewModel(route.values.newItem, commonModels, self.allFas, self.allPosts, self.allDepartments);
    self.roleModel = new GMK.Role.RoleSelectModel(commonModels, route, options);

    self.initialize = function (callback) {
        base._get('Role/ListAllForCreate', null, function (result) {
            self.allDepartments(result.Data.departmentList);
            self.allPosts(result.Data.postList);

            base._get(options.faUrl, null, function (faResult) {
                self.allFas(faResult.Data);
                var data = [];
                $.each(faResult.Data, function (i, r) {
                    data.push({
                        selected: ko.observable(false),
                        note: r.Note,
                        id: r.WFFunctionId
                    });
                });
                self.mAllFags(data);
                self.mAllFunctions(data);
                showFlags();
                self.loadItem(function () {
                    if (callback)
                        callback();
                    self.roleModel.initialize(self.item.functionIds(), faResult.Data);
                });

            });
        });

        self.jstreeModel.initialize();
    };
    self.loadItem = function (callback) {
        if (route.action === 'Create') {
            if (callback) {
                callback();
            }
        } else {
            base._get(options.getUrl, { id: self.id }, function (result) {
                self.item.fromJS(result.Data);
                if (callback) {
                    callback();
                }
            });
        }
    };
    self.onSave = function () {
        var url = (route.action === 'Create' ? 'Role/Create' : 'Role/Edit');

        var plainItem = self.item.toJS();
        base._postThenBack(url, plainItem);
    };

    self.mAllFunctions = ko.observableArray();
    self.mAllFags = ko.observableArray();
    self.mSelectedFags = ko.observableArray();
    self.mKey = ko.observable();
    self.selectAll = ko.observable(false);
    self.mOnCheck = function (item) {
        if (item.selected()) {
            var data = $.grep(self.mSelectedFags(), function (r) {
                return r.id == item.id;
            });
            if (data.length == 0)
                self.mSelectedFags.push(item);
        } else {
            var data = $.grep(self.mSelectedFags(), function (r) {
                return r.id != item.id;
            });
            self.mSelectedFags(data);
        }

        var fun = $.grep(self.mAllFunctions(), function (r) {
            return r.id == item.id;
        });
        if (fun.length > 0) fun[0].selected(item.selected());

        return true;
    };
    self.mOnSelect = function () {
        $.each(self.mShowFlag(), function (i, item) {
            $.each(item, function (j, r) {
                r.selected(self.selectAll());
                self.mOnCheck(r);
            });
        });
        return true;
    };
    self.mOnSearch = function () {
        if (self.mKey().replace(/(^\s*)|(\s*$)/g, "") != "") {
            var data = $.grep(self.mAllFunctions(), function (r) {
                return r.note.indexOf(self.mKey()) != -1;
            });
            self.mAllFags(data);
        } else {
            self.mAllFags(self.mAllFunctions());
        }
        self.selectAll(false);
        showFlags();
    };
    self.mOnSave = function () {
        var ids = $.map(self.mSelectedFags(), function (r) {
            return r.id;
        });
        self.item.functionIds(ids);
        $("#Function").select2('val', ids);
        self.selectAll(false);
        self.mKey('');
    };

    //根据已经选择的权限初始化信息
    self.mInitFun = function () {
        var data = [];
        var sFlag = [];
        $.each(self.allFas(), function (i, r) {
            var ids = $.grep(self.item.functionIds(), function (j) {
                return j == r.WFFunctionId;
            });
            var select = ids.length > 0 ? true : false;

            data.push({
                selected: ko.observable(select),
                note: r.Note,
                id: r.WFFunctionId
            });
            if (select) {
                sFlag.push({
                    selected: ko.observable(select),
                    note: r.Note,
                    id: r.WFFunctionId
                });
            }
        });
        self.mAllFags(data);
        self.mAllFunctions(data);
        self.mSelectedFags(sFlag);
        showFlags();

        return true;
    };

    self.mShowFlag = ko.observableArray();

    //用于分组
    function showFlags() {
        var length = self.mAllFags().length;
        var data = [];
        for (var i = 0; i < parseInt(length / 5) ; i++) {
            var item = [];
            item[0] = self.mAllFags()[i * 5];
            item[1] = self.mAllFags()[i * 5 + 1];
            item[2] = self.mAllFags()[i * 5 + 2];
            item[3] = self.mAllFags()[i * 5 + 3];
            item[4] = self.mAllFags()[i * 5 + 4];

            data.push(item);
        }
        if (length % 5 > 0) {
            var item = [];
            for (var i = 0; i < length % 5; i++) {
                item[i] = self.mAllFags()[parseInt(length / 5) * 5 + i];
            }
            data.push(item);
        }
        self.mShowFlag(data);
    };

    self.jstreeModel = new JsTree.Business.Model(commonModels, "jstree_div");
    self.jstOnShow = function () {
        return self.jstreeModel.onShow(self.item.businessIds());
    };
    self.jstOnSave = function () {
        self.jstreeModel.onSave(function () {
            self.item.businessIds(self.jstreeModel.getSelected());
        });
    };
    self.jstOnCancel = function () {
        self.jstreeModel.onCancel();
    };

    self.roleOnSave = function () {
        var ids = self.roleModel.selectedFunIds();
        self.item.functionIds(ids);
        $("#Function").select2('val', ids);
    }
};

//岗位选择模态框
//不做岗位的反向推演
GMK.Role.RoleSelectModel = function (commonModels, route, options) {
    var self = this;
    var base = GMK.Features.FeatureBase;
    this.roles = ko.observableArray([]);
    this.allFunctions = ko.observableArray([]);
    this.existFuns = ko.observableArray([]); //已有的权限列表
    this.selectedRoles = ko.observableArray([]); //当前选择的岗位
    this.selectedFunIds = ko.observableArray([]);
    this.selectedFuns = ko.computed(function () {
        var funs = [];
        if (self.selectedRoles().length > 0) {
            $.each(self.selectedRoles(), function (i, r) {
                funs = funs.concat(r.functionIds);
            });
            funs = funs.getUnique().concat(self.existFuns()).getUnique();
        } else
            funs = self.existFuns();
        self.selectedFunIds(funs);
        if (funs.length > 0) {
            var allFuns = $.map(funs, function (r) {
                return findFun(self.allFunctions(), r);
            });
            return allFuns;
        } else
            return [];
    });

    var _methods = {
        onShow: function () {
            return true;
        },
        onSelect: function () {
        },
        onSearch: function () {
        },
        onCheck: function (item) {
            if (item.isChecked()) {
                self.selectedRoles.push(item);
            } else
                self.selectedRoles.remove(item);
            return true;
        },
        onSave: function () {
            // return self.selectedFuns();
        },
        initialize: function (funs, allFunctions) {
            self.existFuns(funs);
            self.allFunctions(allFunctions);
            base._get('Role/ListAll', null, function (result) {
                var data = $.map(result.Data, function (r) {
                    r.functionIds = $.map(r.WFRolePermissions, function (role) {
                        return role.WFFunctionId;
                    });
                    r.note = r.Note;
                    r.id = r.WFRoleInfoId;
                    r.isChecked = ko.observable(false);
                    return r;
                });
                self.roles(data);
            });
        },
    };
    $.extend(this, _methods);

    function findFun(allFunctions, id) {
        if (allFunctions && id !== undefined) {
            for (var i = 0; i < allFunctions.length; i++) {
                if (allFunctions[i].WFFunctionId == id) return allFunctions[i];
            }
        }
        return null;
    }
};
