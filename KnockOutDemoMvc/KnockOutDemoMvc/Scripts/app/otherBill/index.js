var GMK = GMK || {};
GMK.OtherBill = GMK.OtherBill || {};
GMK.OtherBill.start = function (data) {
    var $route = $('#gmk-route'), action = $route.data('action'), vm;
    GMK.Features.CommonModels.onReady(function (models) {
        if (action == 'Index') {
            vm = new GMK.OtherBill.IndexViewModel(models, {
                searchUrl: 'OtherBill/List',
                deleteUrl: 'OtherBill/Delete',
                cancelFlowUrl: 'WorkflowMessage/RequestCancelByObject',
            }, {
                salers: data.salers,
                approvalTemplates: data.approvalTemplates
            });
            window.vm = vm;
            vm.initialize();
            ko.applyBindings(vm);
            models.registerQueryFormEvent();
        } else if (action == 'Manage') {
            vm = new GMK.OtherBill.ManageViewModel(models, {
                listUrl: data.listUrl,
                saveUrl: 'OtherBill/Save',
                getUrl: 'OtherBill/Get',
                workflowCreateUrl: data.workflowCreateUrl
            }, {
                id: data.id,
                salers: data.salers,
                approvalTemplates: data.approvalTemplates
            });
            window.vm = vm;
            vm.initialize();
            ko.applyBindings(vm);
        } else if (action == 'Details') {
            vm = new GMK.OtherBill.DetailsViewModel(models, {
                getUrl: 'OtherBill/Get'
            }, {
                id: data.id,
                salers: data.salers,
                approvalTemplates: data.approvalTemplates
            });
            window.vm = vm;
            vm.initialize();
            ko.applyBindings(vm);
        }
    });
};
GMK.OtherBill.IndexViewModel = function (models, actions, extra) {
    var self = this, base = GMK.Features.FeatureBase;
    self.commonModels = models;
    function ViewModel() {
        this.name = ko.observable();
        this.approvalStatus = ko.observable();
    }
    this.query = new ViewModel();
    this.list = ko.observableArray();
    this.remarkNote = ko.observable();
    self.findSaler = function (id) {
        var saler = $.grep(extra.salers, function (item) {
            return item.wfUserId == id;
        });        

        return saler.length > 0 ? saler[0].name : '';
    };
    self.findApprovalTemplate = function (id) {
        var approvale = $.grep(extra.approvalTemplates, function (item) {
            return item.wfApprovalWorkflowTemplateId == id;
        });

        return approvale.length > 0 ? approvale[0].name : '';
    };
    function fill(result) {
        $.each(result.data, function (i, item) {
            item.approvalStatus = ko.observable(item.approvalStatus);
        });
        self.list(result.data);
        base._p(result.pagination, actions.searchUrl, fill, function () {
            return ko.mapping.toJS(self.query);
        });
    }
    self.onSearch = function () {
        base._get(actions.searchUrl, ko.mapping.toJS(self.query), function (result) {
            fill(result);
        });
    };
    self.onDelete = function (item, e) {
        base._delete(actions.deleteUrl, { id: item.wfOtherBillId }, function () {
            $(e.currentTarget).closest('tr').remove();
        });
    };
    var current;
    self.preCancelFlow = function (item) {
        current = item;
    };
    self.onCancelFlow = function (item, e) {
        base._post(actions.cancelFlowUrl, { objectId: current.wfOtherBillId, flowType: models.Enums.ApprovalType.OtherForm, note: self.remarkNote() }, function () {
            current.approvalStatus(models.Enums.ApprovalStatus.Cancelled);
            current = null;
            $(e.currentTarget).closest('.modal').modal('hide');
        });
    };
    self.initialize = function () {
        self.onSearch();
    };
};
GMK.OtherBill.ManageViewModel = function (models, actions, extra) {
    var self = this, base = GMK.Features.FeatureBase;
    self.commonModels = models;
    self.extra = extra;
    function viewModel() {
        this.name = ko.observable();
        this.approvalTemplate = ko.observable();
        this.departmentId = ko.observable();
        this.salerId = ko.observable();
        this.amount = ko.observable();
        this.note = ko.observable();
        this.commodityId = ko.observable();
        this.isBuy = ko.observable('true');
        this.spotAmountType = ko.observable();
        this.transactionType = ko.observable();
    }
    self.vm = new viewModel();
    self.selectedTemplateNote = ko.observable('选择审批模板');
    self.vm.approvalTemplate.subscribe(function (newVal) {
        if (!newVal) self.selectedTemplateNote('选择审批模板');
        self.selectedTemplateNote($.grep(self.extra.approvalTemplates, function (template) {
            return template.wfApprovalWorkflowTemplateId == newVal;
        })[0].note);
    });
    var mapping = {
        include: Object.getOwnPropertyNames(self.vm),
        copy: 'wfOtherBillId'
    };
    self.isContractApprovalTemplate = ko.computed(function () {
        return ($.map($.grep(self.extra.approvalTemplates, function (r) {
            return self.vm.approvalTemplate() === r.wfApprovalWorkflowTemplateId;
        }), function (r) {
            return r.name;
        })[0] || '' + '').indexOf('合同') !== -1;
    });
    self.isContractApprovalTemplate.subscribe(function (newVal) {
        if (_initialize) return;
        if (!newVal) {
            self.vm.isBuy(null);
            self.vm.departmentId(null);
            self.vm.salerId(null);
            self.vm.spotAmountType(null);
            self.vm.transactionType(null);
            self.vm.amount(null);
        } else {
            self.vm.isBuy('true');
        }
    });
    self.isBusinessApprovalTemplate = ko.computed(function () {
        return ($.map($.grep(self.extra.approvalTemplates, function (r) {
            return self.vm.approvalTemplate() === r.wfApprovalWorkflowTemplateId;
        }), function (r) {
            return r.name;
        })[0] || '' + '').indexOf('业务单据') !== -1;
    });
    self.isBusinessApprovalTemplate.subscribe(function (newVal) {
        if (_initialize) return;
        if (!newVal) {
            self.vm.departmentId(null);
            self.vm.salerId(null);
        }
    });
    self.availableBusinessDepartments = ko.computed(function () {
        return $.map($.grep(models.AllCommodities, function (r) {
            return self.vm.commodityId() === r.id;
        }), function (r) {
            return r.businessDepartments || [];
        });
    });
    self.availableSalers = ko.computed(function () {
        return $.map($.grep(self.availableBusinessDepartments(), function (r) {
            return self.vm.departmentId() === r.id;
        }), function (r) {
            return r.salers || [];
        });
    });
    self.save = function (callback) {
        var data = ko.mapping.toJS(self.vm);
        if (!self.isContractApprovalTemplate()) {
            data.transactionType = null;
            data.spotAmountType = null;
        }
        base._post(actions.saveUrl, data, function (result) {
            if (callback) {
                callback(result);
            }
        });
    };
    self.back = base._back;
    self.onSave = function () {
        self.save(self.back);
    };
    self.onSaveAndApplyApproval = function () {
        self.save(function (result) {
            if (result.data.approvable) {
                window.location.href = actions.workflowCreateUrl + '?' + $.param({
                    objectId: extra.id || result.data.id,
                    flowType: models.Enums.ApprovalType.OtherForm,
                    redirect: actions.listUrl
                });
            } else {
                utils.alert('保存成功，此单据不支持审批。', self.back);
                //setTimeout(self.back, 3000);
            }
        });
    };
    var _initialize = false;
    self.initialize = function () {
        if (extra.id) {
            base._get(actions.getUrl, { id: extra.id }, function (data) {
                _initialize = true;
                data.isBuy = (!!data.isBuy) + '';
                ko.mapping.fromJS(data, mapping, self.vm);
                self.vm.salerId(data.salerId); // self.vm.salerId's value is missing, so set it again.
                _initialize = false;
            });
        }
    };
};
GMK.OtherBill.DetailsViewModel = function (models, actions, extra) {
    var self = this, base = GMK.Features.FeatureBase;
    self.commonModels = models;
    self.extra = extra;
    function viewModel() {
        this.name = ko.observable();
        this.approvalTemplate = ko.observable();
        this.departmentId = ko.observable();
        this.salerId = ko.observable();
        this.amount = ko.observable();
        this.note = ko.observable();
        this.commodityId = ko.observable();
        this.isBuy = ko.observable();
        this.spotAmountType = ko.observable();
        this.transactionType = ko.observable();
    }
    self.vm = new viewModel();
    self.isContractApprovalTemplate = ko.computed(function () {
        return ($.map($.grep(self.extra.approvalTemplates, function (r) {
            return self.vm.approvalTemplate() === r.wfApprovalWorkflowTemplateId;
        }), function (r) {
            return r.name;
        })[0] || '' + '').indexOf('合同') !== -1;
    });
    self.isBusinessApprovalTemplate = ko.computed(function () {
        return ($.map($.grep(self.extra.approvalTemplates, function (r) {
            return self.vm.approvalTemplate() === r.wfApprovalWorkflowTemplateId;
        }), function (r) {
            return r.name;
        })[0] || '' + '').indexOf('业务单据') !== -1;
    });
    self.findSaler = function (id) {
        var saler = $.grep(extra.salers, function (item) {
            return item.wfUserId == id;
        });
        return saler.length > 0 ? saler[0].name : '';
    };
    self.findApprovalTemplate = function (id) {
        var approvale = $.grep(extra.approvalTemplates, function (item) {
            return item.wfApprovalWorkflowTemplateId == id;
        });
        return approvale.length > 0 ? approvale[0].name : '';
    };

    self.findDepartments = function (id) {
        var department = $.grep(models.AllBusinessDepartments, function (item) {
            return item.id == id;
        });
        return department.length > 0 ? department[0].name : '';
    };
    
    self.back = base._back;
    self.initialize = function () {
        if (extra.id) {
            base._get(actions.getUrl, { id: extra.id }, function (data) {
                ko.mapping.fromJS(data, null,self.vm);
                self.vm.salerId(data.salerId); // self.vm.salerId's value is missing, so set it again.
            });
        }
    };
};
