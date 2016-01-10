var GMK = GMK || {};
GMK.Company = GMK.Company || {};

GMK.Company.start = function (options) {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        var vm;

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
            if (options.action == 'Detail') {
                var vm = new GMK.Company.AdjustCompanyCreditDetailViewModel(commonModels, {
                    getRatingStructureByModificationIdUrl: 'Company/GetRatingStructureByModificationId',
                }, options);
                vm.initialize(function () {
                    ko.applyBindings(vm);
                });
            } else {
                vm = new GMK.Company.AdjustCompanyCreditViewModel(commonModels, {
                    getcreditRatingStructureUrl: 'Company/GetRatingStructure',
                    saveModificationUrl: 'Company/SaveCreditRatingModification',
                    deleteModificationUrl: 'Company/DeleteCreditRatingModification',
                    cancelCreditRatingApprovalUrl: 'Company/CancelCreditRatingApproval',
                    requestCreateUrl: options.requestCreate,
                    indexUrl: options.indexUrl
                }, options);
                vm.initialize(function () {
                    ko.applyBindings(vm);
                });
            }
        }
    });
};

GMK.Company.AdjustCompanyCreditViewModel = function (commonModels, route, options) {
    var base = GMK.Features.FeatureBase;
    var self = this;
    this.commonModels = commonModels;
    this.note = ko.observable();
    this.salerId = ko.observable();
    this.details = ko.observable();
    this.approvalStatus = ko.observable();
    this.currentPendingPerson = ko.observable();
    this.editingItem = null;
    this.generalModificationId = ko.observable();
    this.permission = ko.observable();
    this.allSalers = $.map(commonModels.AllBusinessDepartments, function (item) {
        return item.salers;
    }).getUnique(function (item) {
        return item.id;
    });

    this.initialize = function (callback) {
        

        base._get(route.getcreditRatingStructureUrl, { id: options.companyId }, function (data) {
            var item = data.data;
            self.generalModificationId(item.modificationId);
            self.approvalStatus(item.approvalStatus);
            self.permission(item.permission);
            self.currentPendingPerson(item.currentPendingPerson ? '('+item.currentPendingPerson+')' : '');
            self.note(item.note);
            self.salerId(item.salerId);
            self.editingItem = item;
            _convertToTree(item.details);
            self.details(item.details[0]);
            if (callback) callback();
            var buyOptions = '<option value="">选择信用等级</option>';
            buyOptions += $.map($.grep(commonModels.AllCreditRatings, function (r) { return r.isbuy == true; }), function (rating) {
                return '<option value="{0}">{1}</option>'.format(rating.id, rating.name);
            }).join();
            var saleOptions = '<option value="">选择信用等级</option>';
            saleOptions += $.map($.grep(commonModels.AllCreditRatings, function (r) { return r.isbuy == false; }), function (rating) {
                return '<option value="{0}">{1}</option>'.format(rating.id, rating.name);
            }).join();
            $('#sample').treeview({
                showTags: true,
                tagTemplate: '<select class="tree-node-tag tree-node-tag-last is-sale" data-init-value="{4}">{3}</select><span class="tree-node-tag-col1">{5}</span><select class="tree-node-tag" data-init-value="{1}">{0}</select><span class="tree-node-tag-col1">{2}</span>',
                renderTag: function (template, tag) {
                    return template.format(buyOptions, tag[0] || '', tag[1] || '--', saleOptions, tag[2] || '', tag[3] || '--');
                },
                itemRenderedCallback: function (data) {
                    var $select = data.li.children('select.tree-node-tag');
                    $select.each(function () {
                        var $this = $(this);
                        $this.val($this.data('init-value'));
                        $this.change(function () {
                            data.node[$this.hasClass('is-sale') ? 'saleDetail' : 'buyDetail'].newValue($this.val());
                        });
                    });
                },
                data: self.details()
            });
        });
    };
    function _filterChildren(root, output) {
        var temp = $.grep(root.children, function (item) {
            var result = false;
            if (item.buyDetail.newValue != item.buyDetail.oldValue) {
                item.buyDetail.newDisplayValue = commonModels.findCreditRating(item.buyDetail.newValue);
                result = true;
            }
            if (item.saleDetail.newValue != item.saleDetail.oldValue) {
                item.saleDetail.newDisplayValue = commonModels.findCreditRating(item.saleDetail.newValue);
                result = true;
            }
            return result;
        });
        if (temp.length) {
            temp = $.map(temp, function (elem) {
                var mapping = $.extend({}, elem);
                mapping.children = null;
                return mapping;
            });
            output.push.apply(output, temp);
        }
        $.each(root.children, function (i, elem) {
            _filterChildren(elem, output);
        });
    }
    function _toJS() {
        var details = ko.toJS(self.details);
        var changedDetails = [];
        _filterChildren({children:[details]}, changedDetails);
        self.editingItem.details = changedDetails;
        self.editingItem.note = self.note();
        self.editingItem.salerId = self.salerId();
        return self.editingItem;
    }
    function _convertToTree(details) {
        $.each(details, function (i, item) {
            item.text = _getText(item);
            makeObservable(item.buyDetail);
            makeObservable(item.saleDetail);
            item.tag = [item.buyDetail.newValue(), item.buyDetail.oldDisplayValue, item.saleDetail.newValue(), item.saleDetail.oldDisplayValue];
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
                return item.companyName;
                break;
            case modificationTable.WFCustomerCommodity:
                return item.commodityName;
                break;
        }
    }
    this.onSave = function () {
        var param = _toJS();
        if (!param.details.length) {
            alert('信用等级没有任何调整');
            return;
        }
        base._postThenBack(route.saveModificationUrl, param);
    };
    this.onSubmit = function () {
        var param = _toJS();
        if (!param.details.length) {
            alert('信用等级没有任何调整');
            return;
        }
        base._post(route.saveModificationUrl, param, function (result) {
            if (result.data.approvable) {
                window.location.href = route.requestCreateUrl + '?' + $.param({
                    objectId: result.data.id,
                    flowType: commonModels.Enums.ApprovalType.CompanyCreditRatingModification,
                    redirect: route.indexUrl
                });
            } else {
                utils.alert('保存成功，此单据不支持审批。', self.back);
            }
        });
    };
    this.onCancel = function () {
        confirm('确认要撤销申请吗？', function () {
            base._post(route.cancelCreditRatingApprovalUrl, { modificationId: self.generalModificationId() }, function () {
                History.back();
            });
        });
    };
    this.onDelete = function () {
        confirm('确认要撤销调整吗？', function () {
            base._post(route.deleteModificationUrl, { id: self.generalModificationId() }, function () {
                History.back();
            });
        });
    };
};

GMK.Company.AdjustCompanyCreditDetailViewModel = function (commonModels, route, options) {

    var base = GMK.Features.FeatureBase;
    var self = this;
    this.commonModels = commonModels;
    this.note = ko.observable();
    this.details = ko.observable();
    this.approvalStatus = ko.observable();
    this.currentPendingPerson = ko.observable();
    this.initialize = function (callback) {
        base._get(route.getRatingStructureByModificationIdUrl, {
            modificationId: options.modificationId,
            companyId: options.companyId,
            isCommoditiesAccessLimited: false
        }, function (data) {
            var item = data.data;
            self.approvalStatus(item.approvalStatus);
            self.currentPendingPerson(item.currentPendingPerson || '');
            self.note(item.note);
            _convertToTree(item.details);
            self.details(item.details[0]);
            if (callback) callback();
            $('#sample').treeview({
                showTags: true,
                tagTemplate: '<input type="text" value="{2}" readonly class="tree-node-tag tree-node-tag-last {5}" /><span class="tree-node-tag-col1">{3}</span><input type="text" value="{0}" readonly class="tree-node-tag tree-node-tag-last {4}" /><span class="tree-node-tag-col1">{1}</span>',
                renderTag: function (template, tag) {
                    return template.format(tag[0] || '--', tag[1] || '--', tag[2] || '--', tag[3] || '--', tag[0] != tag[1] ? 'bold' : '', tag[2] != tag[3] ? 'bold' : '');
                },
                itemRenderedCallback: function (data) {
                    var $select = data.li.children('input.input');
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
            item.tag = [item.buyDetail.newDisplayValue, item.buyDetail.oldDisplayValue, item.saleDetail.newDisplayValue, item.saleDetail.oldDisplayValue];
            _convertToTree(item.children);
        });
    }
    function makeObservable(detail) {
        if (!detail.oldDisplayValue) detail.oldDisplayValue = commonModels.findCreditRating(detail.oldValue);
        if (!detail.newDisplayValue) detail.newDisplayValue = commonModels.findCreditRating(detail.newValue);
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
