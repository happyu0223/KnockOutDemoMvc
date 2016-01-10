/**
 * Created by amy on 2015-01-27.
 */

var GMK = GMK || {};
GMK.CreditRating = GMK.CreditRating || {};
GMK.CreditRating.Credit = GMK.CreditRating.Credit || {};

GMK.CreditRating.Credit.start = function (viewRoute) {
    var $routeElem = $("#gmk-route"), route = {
        baseUrl: 'CreditRating/',
        action: $routeElem.data("action"),
        key: $routeElem.data("key")
    };
    GMK.Features.CommonModels.onReady(function (models) {
        if (route.action == 'Create') {
            if (viewRoute) {
                var viewModel = new GMK.CreditRating.Credit.ManageViewModel(models, viewRoute, {
                    saveUrl: route.baseUrl + 'SaveCreditRating',
                });
                window.vm = viewModel;
                ko.applyBindings(viewModel);
                viewModel.initialize();
                $('#creditRatingForm').validate({
                    rules: {
                        AmountQuota: {
                            isMinus: true
                        },
                        QuantityQuota: {
                            isMinus: true
                        }
                    },
                });
            }
        }
    });
};

GMK.CreditRating.Credit.ManageViewModel = function (models, options, route) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    function viewModel() {
        var vm = this;
        vm.creditViewModel = ko.mapping.fromJS(options.data || {});
        if (vm.creditViewModel.IsBuy() == null) {
            vm.creditViewModel.IsBuy('true');
        } else {
            if (vm.creditViewModel.IsBuy()) {
                vm.creditViewModel.IsBuy("true");
            } else
                vm.creditViewModel.IsBuy("false");
        }
        if (vm.creditViewModel.IsTradeAllowed() == null) {
            vm.creditViewModel.IsTradeAllowed('true');
        } else {
            if (vm.creditViewModel.IsTradeAllowed()) {
                vm.creditViewModel.IsTradeAllowed("true");
            } else
                vm.creditViewModel.IsTradeAllowed("false");
        }

        vm.creditViewModel.editable = ko.computed(function () {
            if ((vm.creditViewModel.IsTradeAllowed() + '').toLocaleLowerCase() == "false") {
                vm.creditViewModel.AmountQuota(null);
                vm.creditViewModel.QuantityQuota(null);
                return 'disabled';
            } else
                return undefined;
        }, this);

        vm.detailsForShow = ko.observableArray();
    }
    viewModel.call(this);
    self.save = function (callback) {
        if (isEditingNow(self.detailsForShow())) {
            confirm("还有编辑的详情未保存，是否放弃保存直接提交？", function () {
                $.each(self.detailsForShow(), function (i, item) {
                    if (item.isEditing()) { //正处于编辑状态的，全部回归以前的value
                        item.data.IsTradeAllowed(item.olddata.IsTradeAllowed);
                        item.data.AmountQuota(item.olddata.AmountQuota);
                        item.data.QuantityQuota(item.olddata.QuantityQuota);
                        item.data.Note(item.olddata.Note);
                    }
                });
                _saveData(callback);
            });
        } else
            _saveData(callback);
    };
    self.back = base._back;
    self.onSave = function () {
        self.save(self.back);
    };

    self.invalids = {
        credit: ko.observable(0),
        saveDetails: ko.observable(0)
    };
    self.customShowErrors = ko.observable();
    utils.setCustomShowErrors(self.customShowErrors);
    self.setCustomShowErrors = {
        credit: function () { self.customShowErrors(self.invalids.credit); },
        saveDetails: function () { self.customShowErrors(self.invalids.saveDetails); }
    }

    self.initialize = function () {
        initDetails();
        jQuery.validator.addMethod("isMinus", function (value, element) {
            return this.optional(element) || isMinusNumber(value);
        }, "金额和重量不能为负数");

        $('#detailTable tr').tooltip({
            delay:{ show: 600, hide: 600 }
        });

        $.each($('#detailTable tr'), function (i, item) {
            $(item).on('show.bs.tooltip', function () {
                setTimeout(function () {
                    $(item).tooltip('destroy');
                }, 2000);
            });
        });
    };

    function isMinusNumber(value) {
        if (parseFloat(value) >= 0) {
            return true;
        }else
            return false;
    }

    function _saveData(callback) {
        var creditInfo = ko.mapping.toJS(self.creditViewModel);
        var details = [];
        $.each(self.detailsForShow(), function (i, item) {
            if (item.isAdded) {         
                details.push(item.data);
            }
        });

        creditInfo.WFCreditRatingDetails = ko.mapping.toJS(details);
        if (creditInfo.WFCreditRatingDetails.length == 0 && isNullOrEmpty(creditInfo.AmountQuota)
            && ((creditInfo.IsTradeAllowed + "").toLowerCase() == 'true')) {
            alert("详细列表为空时，缺省金额必须填写！");
        } else {
            base._post(route.saveUrl, creditInfo, function (result) {
                if (callback) {
                    callback(result);
                }
            });
        }
    }

    function initDetails() {
        var creditRatingDetailTypes = models.EnumOptions.CreditRatingDetailType;
        var commodityTypes = models.AllCommodities;
        var details = [];

        $.each(creditRatingDetailTypes, function (i, val) {
            if (val.text == "品种") {
                $.each(commodityTypes, function (j, comm) {
                    var item = {
                        data: ko.mapping.fromJS(options.newdetail || {}),
                        isAdded: false, isEditing: ko.observable(false),
                        canEditQuantity: true,
                        onEditDetails: editDetails, onClearDetail: clearDetails, onSaveDetails: saveDetails
                    };

                    item.data.CreditRatingDetailType(val.value);
                    item.data.WFCommodityId(comm.id);
                    item.editable = ko.computed(function () {
                        if ((item.data.IsTradeAllowed() + '').toLocaleLowerCase() == "false") {
                            item.data.AmountQuota(null);
                            item.data.QuantityQuota(null);
                            return 'disabled';
                        } else
                            return undefined;
                    }, this);
                    details.push(item);
                });
            } else {
                var item = {
                    data: ko.mapping.fromJS(options.newdetail || {}),
                    isAdded: false, isEditing: ko.observable(false),
                    canEditQuantity: false,
                    onEditDetails: editDetails, onClearDetail: clearDetails, onSaveDetails: saveDetails
                };
                item.data.CreditRatingDetailType(val.value);
                item.editable = ko.computed(function () {
                    if ((item.data.IsTradeAllowed() + '').toLocaleLowerCase() == "false") {
                        item.data.AmountQuota(null);
                        item.data.QuantityQuota(null);
                        return 'disabled';
                    } else
                        return undefined;
                }, this);
                details.push(item);
            }
        });

        var fromDetails = [];

        if (vm.creditViewModel.WFCreditRatingDetails().length <= 0) {
            self.detailsForShow(details);
        } else {
            var creditRatingDetails = vm.creditViewModel.WFCreditRatingDetails();
            $.each(details, function (i, detail) {
                var isEdit = isFromEdit(detail, creditRatingDetails);

                if (isEdit != -1) {
                    detail.isAdded = true;
                    detail.data = creditRatingDetails[isEdit];
                    if (detail.data.IsTradeAllowed() != null) {
                        if (detail.data.IsTradeAllowed()) {
                            detail.data.IsTradeAllowed("true");
                        } else
                            detail.data.IsTradeAllowed("false");
                    }

                    detail.editable = ko.computed(function () {
                        if ((detail.data.IsTradeAllowed() + '').toLocaleLowerCase() == "false") {
                            detail.data.AmountQuota(null);
                            detail.data.QuantityQuota(null);
                            return 'disabled';
                        } else
                            return undefined;
                    }, this);

                    fromDetails.push(detail);
                } else
                    fromDetails.push(detail);
            });

            self.detailsForShow(fromDetails);
        }
        
    }

    function isFromEdit(item, details) {
        var index = -1;

        $.each(details, function (i, val) {
            if (item.data.CreditRatingDetailType() == val.CreditRatingDetailType()
                && item.data.WFCommodityId() == val.WFCommodityId()) { //database have it
                index = i;
                return false;
            }
        });
        return index;
    }

    function editDetails(index, item, e) {
        if (e.target.tagName == "BUTTON") {
            return false;
        } else if (!item.isEditing()) {
            item.isEditing(true);

            item.olddata = {};
            item.olddata.AmountQuota = item.data.AmountQuota();
            item.olddata.QuantityQuota = item.data.QuantityQuota();
            item.olddata.IsTradeAllowed = item.data.IsTradeAllowed();
            item.olddata.Note = item.data.Note();
            if (item.data.IsTradeAllowed() == null) {
                item.data.IsTradeAllowed("true");
            }
        }
        return true;
    };

    function saveDetails(item) {
        if (item.isEditing()) {    
            if (isNullOrEmpty(item.data.AmountQuota()) &&
                isNullOrEmpty(item.data.QuantityQuota()) && item.data.IsTradeAllowed() == 'true') {
                alert("金额和重量不能同时为空");                
            } else if (isNaN(item.data.AmountQuota()) || (item.canEditQuantity && isNaN(item.data.QuantityQuota()))) {
                
            } else if (parseFloat(item.data.AmountQuota()) < 0 || (item.canEditQuantity && parseFloat(item.data.QuantityQuota()) < 0)) {
                
            } else{
                item.isEditing(false);
                item.isAdded = true;
            }
        }
    }

    function clearDetails(item) {
        if (!item.isEditing()) { //非编辑状态，移除
            item.data.IsTradeAllowed(null);
            item.data.AmountQuota(null);
            item.data.QuantityQuota(null);
            item.data.Note(null);
            item.isAdded = false;
        } else {
            item.data.IsTradeAllowed(item.olddata.IsTradeAllowed);
            item.data.AmountQuota(item.olddata.AmountQuota);
            item.data.QuantityQuota(item.olddata.QuantityQuota);
            item.data.Note(item.olddata.Note);
            item.isEditing(false);            
        }
    };

    function isEditingNow(items) {
        var editing = false;
        $.each(items, function (i, item) {
            if (item.isEditing()) {
                editing = true;
                return false;
            }
        });

        return editing;
    }

    function isNullOrEmpty(val) {
        if (val == null)
            return true;
        else {
            var flag = false;
            switch (typeof val) {
                case "string":
                    if (val.replace(/\s+/g, "") == "") {
                        flag = true;
                    }
                    break;
                case "number":
                    break;
                case "undefined":
                    flag = true;
                    break;
            }
            return flag;
        }
    }
}