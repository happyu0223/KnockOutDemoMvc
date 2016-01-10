var GMK = GMK || {};
GMK.Attachment = GMK.Attachment || {};
GMK.Attachment.start = function (route, element, success) {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        var viewModel;
        if (route.action === 'SelectForWfRequest') {
            viewModel = new GMK.Attachment.SelectForWfRequestViewModel(commonModels, route, {});
        } else if (route.action === 'Index') {
            viewModel = new GMK.Attachment.ContractIndexViewModel(commonModels, route, {});
        } else if (route.action === 'ContractIndex') {
            viewModel = new GMK.Attachment.ContractIndexViewModel(commonModels, route, {});
        }
        window.vm = viewModel;
        if (viewModel) {
            if (route.action === 'ContractIndex') {
                viewModel.loadAttachments();
                ko.applyBindings(viewModel);
                viewModel.initFileUpload();
                if (success) {
                    success(viewModel);
                }
            } else {
                viewModel.initialize(function () {
                    ko.applyBindings(viewModel, element);
                    if (success) {
                        success(viewModel);
                    }
                });
            }
        }
    });
};
GMK.Attachment.AttachmentFileViewModel = function (attachmentFile, attachment, route) {
    var self = this;
    var file = ko.toJS(attachmentFile || {}),
        att = attachment || {};
    self.checked = ko.observable(false);
    self.id = ko.observable(file.WFContractBillArchiveDetailId);
    self.attachmentName = ko.observable(ko.toJS(att.Name));
    self.fileName = ko.observable(file.FileName);
    self.fileSize = ko.observable(file.FileSize);
    self.filenameExtension = ko.observable(file.FilenameExtension);
    self.isMainContent = ko.observable(attachmentFile.IsMainContent);
    //self.filenameExtension = ko.computed(function () {
    //    var fileName = self.fileName() || '';
    //    var index = fileName.lastIndexOf('.');
    //    return index < 0 ? '' : fileName.slice(index).toLowerCase();
    //});
    self.filenameWithoutExtension = ko.observable(file.FilenameWithoutExtension);
    //self.filenameWithoutExtension = ko.computed(function () {
    //    var fileName = self.fileName() || '';
    //    var index = fileName.lastIndexOf('.');
    //    return index < 0 ? fileName : fileName.slice(0, index);
    //});
    self.type = ko.computed(function () {
        var type = 'other';
        switch (self.filenameExtension()) {
            case '.pdf':
                type = 'pdf';
                break;
            case '.png':
            case '.gif':
            case '.jpg':
            case '.jpeg':
            case '.bmp':
                type = 'image';
                break;
            default:
                break;
        }
        return type;
    });
    self.fileurl = ko.computed(function () {
        return route.downloadFileUrl + '?' + $.param({ fileId: self.id() });
    });
    self.imgsrc = ko.computed(function () {
        return route.openFileUrl + '?' + $.param({ fileId: self.id() });
    });
    self.text = ko.computed(function () {
        return '附件：' + self.attachmentName() + '，文件名：' + self.fileName();
    });
};
GMK.Attachment.ItemViewModel = function (plainData, root, route) {
    var self = $.extend(this, ko.mapping.fromJS(plainData));
    $.each(self.WFContractBillArchiveDetails(), function (i, r2) {
        r2.file = new GMK.Attachment.AttachmentFileViewModel(r2, null, route);
    });
    self.contractIds = ko.observableArray($.map(self.WFContractBillArchiveLinkers(), function (r) {
        return r.WFContractInfoId();
    }));
    self.contractCodes = ko.computed(function () {
        return $.map(self.WFContractBillArchiveLinkers(), function (r) {
            return r.ContractCode();
        });
    });
    self.toJs = function () {
        var plain = ko.mapping.toJS(self);
        var ids = self.contractIds();
        var linkers = $.map(ids, function (r) {
            var linker = $.extend(true, {}, root.values.newLinker, {
                //ContractCode: '',
                WFContractInfoId: r,
                WFBillArchiveId: self.WFContractBillArchiveId()
            });
            return linker;
        });
        plain.WFContractBillArchiveLinkers = linkers;
        return plain;
    };
};
GMK.Attachment.SelectForWfRequestViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.values = route.values;
    var ItemVM = GMK.Attachment.ItemViewModel;
    self.initialize = function (callback) {
        self.search(callback);
    };
    self.searchUrl = 'Attachment/ListQuery';
    self.query = ko.observable(ko.mapping.fromJS(route.values.query));
    self.currQuery = ko.mapping.toJS(self.query());
    self.items = ko.observableArray();
    self.onSearch = function () {
        self.search();
    };
    self.search = function (callback) {
        self.query().Pagination.CurrentPage(1);
        self.currQuery = ko.mapping.toJS(self.query());
        self.loadItems(callback);
    };
    self.loadItems = function (callback) {
        base._get(self.searchUrl, self.currQuery, function (result) {
            self.fillItems(result);
            if (callback) {
                callback();
            }
        });
    };
    self.fillItems = function (result) {
        self.currQuery.Pagination = result.Data.pagination;
        self.query(ko.mapping.fromJS(self.currQuery));
        var items = $.map(result.Data.list, function (r) {
            return new ItemVM(r, self, route);
        });
        self.items(items);
        base._pagination($(route.values.pager), +self.currQuery.Pagination.PageCount, +self.currQuery.Pagination.TotalCount, +self.currQuery.Pagination.CurrentPage, function (newPage) {
            self.currQuery.Pagination.CurrentPage = +newPage;
            self.loadItems();
        }, +self.currQuery.Pagination.PageSize);

        //base._paginate($(route.values.pager), $.extend(true, {}, self.currQuery.Pagination), function () {
        //    return $.extend(true, {}, self.currQuery);
        //}, self.searchUrl, self.fillItems, function (q, p) {
        //    self.currQuery.Pagination.CurrentPage = p.currentPage || p.CurrentPage || 1;
        //    return $.extend(true, {}, self.currQuery);
        //});
    };
    self.currItem = ko.observable();
    self.cancelNote = ko.observable();
    self.toCancel = function (item) {
        self.currItem(item);
        self.cancelNote('');
    };
    self.onCancel = function () {
        confirm('确定要撤销？', function () {
            base._post('WorkflowMessage/RequestCancelByObject', {
                objectId: self.currItem().WFContractBillArchiveId(),
                flowType: commonModels.Enums.ApprovalType.OtherForm,
                note: self.cancelNote()
            }, function (result) {
                self.loadItems();
                $(route.values.modalCancelFlow).modal('hide');
            });
        });
    }
};
GMK.Attachment.ContractIndexViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.values = route.values;
    var ItemVM = GMK.Attachment.ItemViewModel;

    self.items = ko.observableArray([]);
    var objectId = route.objectId;
    var objectType = route.objectType;
    var isListQuery = false;

    self.initialize = function (callback) {
        self.loadContracts(function () {
            isListQuery = true;
            self.search(function () {
                if (callback) {
                    callback();
                }
                self.initFileUpload();
                //$('.select2').select2({ closeOnSelect: false });
            });
        });
    };

    self.loadContracts = function (callback) {
        base._get('Attachment/ContractList', {}, function (result) {
            self.contracts(result.Data);
            self.contractsOptions(result.Data);

            if (callback) {
                callback();
            }
        });
    };

    self.loadAttachments = function () {
        GMK.Features.FeatureBase._get('Attachment/ListOld', { objectId: parseInt(objectId), objectType: parseInt(objectType) }, function (data) {
            self.plainItems = data.Data;
            var items = $.map(data.Data, function (r1) {
                var item = ko.mapping.fromJS(r1);
                $.each(item.WFContractBillArchiveDetails(), function (i, r2) {
                    r2.file = new GMK.Attachment.AttachmentFileViewModel(r2, null, route);
                });
                return item;
            });
            self.items(items);
        });
    };

    self.searchUrl = 'Attachment/ListQuery';
    self.byAttachmentId = ko.observable(false);
    self.byContractId = ko.observable(false);
    if ($.isNumeric(route.values.query.AttachmentId)) {
        self.byAttachmentId(true);
        route.values.query = { Pagination: route.values.query.Pagination, AttachmentId: route.values.query.AttachmentId };
    }
    if ($.isNumeric(route.values.query.ContractId)) {
        self.byContractId(true);
        route.values.query = { Pagination: route.values.query.Pagination, ContractId: route.values.query.ContractId };
    }
    self.query = ko.observable(ko.mapping.fromJS(route.values.query));
    self.currQuery = ko.mapping.toJS(self.query());
    self.plainItems = [];
    self.onSearch = function () {
        self.search();
    };
    self.search = function (callback) {
        self.query().Pagination.CurrentPage(1);
        self.currQuery = ko.mapping.toJS(self.query());
        self.loadItems(callback);
    };
    self.loadItems = function (callback) {
        base._get(self.searchUrl, self.currQuery, function (result) {
            self.fillItems(result);
            if (callback) {
                callback();
            }
        });
    };
    self.fillItems = function (result) {
        self.currQuery.Pagination = result.Data.pagination;
        self.query(ko.mapping.fromJS(self.currQuery));
        self.plainItems = result.Data.list;
        var items = $.map(result.Data.list, function (r1) {
            var item = new ItemVM(r1, self, route);
            //$.each(item.WFContractBillArchiveDetails(), function (i, r2) {
            //    r2.file = new GMK.Attachment.AttachmentFileViewModel(r2);
            //});
            return item;
        });
        self.items(items);
        base._pagination($(route.values.pager), +self.currQuery.Pagination.PageCount, +self.currQuery.Pagination.TotalCount, +self.currQuery.Pagination.CurrentPage, function (newPage) {
            self.currQuery.Pagination.CurrentPage = +newPage;
            self.loadItems();
        }, +self.currQuery.Pagination.PageSize);
        //base._paginate($(route.values.pager), $.extend(true, {}, self.currQuery.Pagination), function () {
        //    return $.extend(true, {}, self.currQuery);
        //}, self.searchUrl, self.fillItems, function (q, p) {
        //    self.currQuery.Pagination.CurrentPage = p.currentPage || p.CurrentPage || 1;
        //    return $.extend(true, {}, self.currQuery);
        //});
    };
    self.currItem = ko.observable(new ItemVM(route.values.newItem, self, route));
    self.isCreating = ko.observable(false);
    self.isEditing = ko.observable(false);
    self.isFilesing = ko.observable(false);

    self.toCreate = function () {
        self.isCreating(true);
        self.isEditing(true);
        self.isFilesing(false);
        self.currItem(new ItemVM(route.values.newItem, self, route));
        $('.select2').select2('destroy');
        $('.select2').select2({ closeOnSelect: false });
        $(route.values.modalItem).modal('show');
    };
    self.toUpdate = function (item) {
        self.isCreating(false);
        self.isEditing(true);
        self.isFilesing(false);
        var i = self.items.indexOf(item);
        var plainItem = self.plainItems[i];
        self.currItem(new ItemVM(plainItem, self, route));
        $('.select2').select2('destroy');
        $('.select2').select2({ closeOnSelect: false });
        $(route.values.modalItem).modal('show');
    };

    self.exitEdit = function () {
        $(route.values.modalItem).modal('hide');
        window.setTimeout(function () {
            self.isCreating(false);
            self.isEditing(false);
        }, 1000);
    };
    self.toFiles = function (item) {
        self.isCreating(false);
        self.isEditing(false);
        self.isFilesing(true);
        var i = self.items.indexOf(item);
        var plainItem = self.plainItems[i];
        self.currItem(new ItemVM(plainItem, self, route));
        $(route.values.modalFiles).modal('show');
    };
    self.exitFiles = function () {
        if (isListQuery) {
            self.loadItems();
        } else {
            self.loadAttachments();
        }

        $(route.values.modalFiles).modal('hide');
        window.setTimeout(function () {
            self.isFilesing(false);
        }, 1000);
    };

    self.onSave = function () {
        var saveUrl = (self.isCreating() ? 'Attachment/Create' : 'Attachment/Update');
        var data = self.currItem().toJs();
        base._post(saveUrl, data, function (result) {
            if (isListQuery) {
                self.loadItems();
            } else {
                self.loadAttachments();
            }
            if (self.isCreating()) {
                self.currItem().WFContractBillArchiveId(result.Data.WFContractBillArchiveId);
            }
            self.isCreating(false);
            self.isEditing(false);
            $(route.values.modalItem).modal('hide');
            $(route.values.modalFiles).modal('show');
            self.isFilesing(true);
            //var item = self.isCreating() ? new ItemVM(result.Data, self) : self.currItem();
            //self.toFiles(item);
        });
    };

    self.onDelete = function (item) {
        confirm('确定要删除？', function () {
            var data = ko.mapping.toJS(item);
            base._post('Attachment/Delete', data, function (result) {
                if (isListQuery) {
                    self.loadItems();
                } else {
                    self.loadAttachments();
                }
            });
        });
    };
    self.onDeleteFile = function (af) {
        confirm('确定要删除？', function () {
            var data = ko.mapping.toJS(af);
            base._post('Attachment/DeleteFile', data, function (result) {
                self.currItem().WFContractBillArchiveDetails.remove(af);
                if (isListQuery) {
                    self.loadItems();
                } else {
                    self.loadAttachments();
                }
            });
        });
    };
    self.initFileUpload = function () {
        $(route.values.fileupload).fileupload({
            dataType: 'json',
            add: function (e, data) {
                $('#page-spinner').modal('show');
                data.formData = {
                    WFContractBillArchiveId: self.currItem().WFContractBillArchiveId(),
                    corpId: self.values.corpId
                };
                data.submit();
            },
            done: function (e, data) {
                if (data.result.Status === true) {
                    $.each(data.result.Data, function (i, af) {
                        var detail = ko.mapping.fromJS(af);

                        detail.file = new GMK.Attachment.AttachmentFileViewModel(af, null, route);

                        self.currItem().WFContractBillArchiveDetails.push(detail);
                    });
                    if (isListQuery) {
                        self.loadItems();
                    } else {
                        self.loadAttachments();
                    }
                } else {
                    alert(data.result.Message);
                }
            },
            always: function () {
                $('#page-spinner').modal('hide');
            }
        });
    };
    self.contracts = ko.observableArray();

    function computeContracts(contracts, linkers) {
        var currContracts = $.map(linkers, function (r) {
            return { id: r.WFContractInfoId(), text: r.ContractCode() };
        });
        var ids = $.map(contracts, function (r) {
            return r.id;
        });
        var otherContracts = $.grep(currContracts, function (r) {
            return $.inArray(r.id, ids) === -1;
        });
        return otherContracts.concat(contracts);
    }
    //self.contractsOptionsComputed = ko.computed(function () {
    //    return computeContracts(self.contracts(), self.currItem().WFContractBillArchiveLinkers());
    //});
    self.contractsOptions = ko.observableArray();
    self.currItem.subscribe(function (newValue) {
        var options = computeContracts(self.contracts(), newValue.WFContractBillArchiveLinkers());
        self.contractsOptions(options);
    });
}
