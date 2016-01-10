/**
 * Created by dawson.liu on 13-10-15.
 */


var GMK = GMK || {};
GMK.Contract = GMK.Contract || {};
GMK.Contract.PriceConfirmationLetter = GMK.Contract.PriceConfirmationLetter || {};

GMK.Contract.PriceConfirmationLetter.start = function (route) {
    GMK.Features.CommonModels.onReady(function (models) {
        var url = $.url(),
            viewModel = new GMK.Contract.PriceConfirmationLetter.DefaultViewModel(models, {
                getUrl: 'Contract/GetPriceConfirmationLetter',
                saveUrl: 'Contract/SavePriceConfirmationLetter',
                requestCreateUrl: route.requestCreateUrl,
                priceConfirmationLetterUrl: route.priceConfirmationLetterUrl,
                archiveIndexUrl: route.archiveIndexUrl,
                contractId: route.values.contractId
            });
        window.vm = viewModel;
        viewModel.initialize(function () {
            ko.applyBindings(viewModel);
        });
    });
};

GMK.Contract.PriceConfirmationLetter.DefaultViewModel = function (models, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;
    self.contractId = options.contractId;

    function viewModel() {
        var vm = this;
        vm.context = ko.observable();
        vm.invalideRequest = ko.observable(false);

        vm.fill = function (data) {
            if (data) {
                vm.context(ko.mapping.fromJS(data));
                vm.priceConfirmLetterId = vm.context().WFPriceConfirmationLetterId();
            } else {
                vm.invalideRequest(true);
            }
        }
        vm.toJson = function () {
            var data = $.extend(vm.context(), utils.serialize('#priceConfirmLetter .gmk-data-field'));
            delete data.WFContractInfo;
            return data;
        };
    }

    viewModel.call(this);

    self.onDeleteAndGenerate = function () {
        base._post('Contract/DeletePriceConfirmationLetter', {
            contractId: self.contractId
        }, self.afterSave, null, null, self.afterSave);
    };

    self.save = function (callback) {
        base._post(options.saveUrl, self.toJson(), callback, null, null, self.afterSave);
    };
    self.afterSave = function () {
        self.context(null);
        self.load();
    };
    self.onSave = function () {
        self.save(self.afterSave);
    };

    self.onPrint = function () {
        //base._post(options.saveUrl, self.toJson(), function (data) {
        //    if (data.Status) {
        var printUrl = options.archiveIndexUrl + '?' + $.param({
            templateType: models.Enums.BillTemplateType.PriceConfirmBill,
            dataSourceId: self.context().WFPriceConfirmationLetterId()
        });
        utils.openWindow().redirectTo(printUrl);
        //    }
        //});
    };

    self.onSaveAndReqestApprove = function () {
        self.save(function (result) {
            if (result.Status) {
                if (result.Data.approvable) {
                    location.href = options.requestCreateUrl + '?' + $.param({
                        objectId: self.context().WFPriceConfirmationLetterId(),
                        flowType: models.Enums.ApprovalType.PriceConfirmBill,
                        redirect: options.priceConfirmationLetterUrl + '?' + $.param({ contractId: self.contractId })
                    });
                } else {
                    var dialogClosed = false;
                    var dialog = utils.alert('保存成功，此单据不支持审批。', function () {
                        if (!dialogClosed) {
                            dialogClosed = true;
                            dialog.close();
                            self.afterSave();
                        }
                    });
                    //setTimeout(dialog.ok, 3000);
                }
            } else {
                alert('保存失败，发生未知错误！');
            }
        }, null, null, self.afterSave);
    };

    self.load = function (callback) {
        base._get(options.getUrl, { contractId: self.contractId }, function (result) {
            self.fill(result.Data);
            if (callback) {
                callback(result);
            }
        }, true);
    };

    self.initialize = function (callback) {
        self.load(function () {
            if (callback) {
                callback();
            }
        });
    };
}

