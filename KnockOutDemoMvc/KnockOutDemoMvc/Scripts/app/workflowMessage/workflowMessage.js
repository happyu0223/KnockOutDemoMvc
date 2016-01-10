var GMK = GMK || {};
GMK.WorkflowMessage = GMK.WorkflowMessage || {};
GMK.WorkflowMessage.start = function (route, element, success) {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        var viewModel;
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
        if (route.action === 'RequestCreate') {
            viewModel = new GMK.WorkflowMessage.RequestCreateViewModel(commonModels, route, {});
        } else if (route.action === 'Index') {
            viewModel = new GMK.WorkflowMessage.IndexViewModel(commonModels, route, {});
        }
        if (viewModel) {
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
GMK.WorkflowMessage.IndexViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.initialize = function (callback) {
        var directIfOne = location.hash === '#directIfOne';
        History.replaceState(null, null, location.pathname + location.search);
        var tabName = self.currTabName();
        if (!tabName || !self[tabName] || !self[tabName].onSelect) {
            tabName = 'tome';
        }
        self[tabName].select(function () {
            if (directIfOne) {
                if (tabName === 'tome') {
                    var items = $.grep(self[tabName].items(), function (r) {
                        return !r.IsFinished();
                    });
                    if (items.length === 1) {
                        var url = route.taskUrl + '/' + items[0].WFUserTaskId();
                        location.href = url;
                    }
                } else if (tabName === 'ccme') {
                    var items = $.grep(self[tabName].items(), function (r) {
                        return !r.IsRead();
                    });
                    if (items.length === 1) {
                        var url = route.messageDetailsUrl + '/' + items[0].WFUserMessageId();
                        location.href = url;
                    }
                }
            }
        });
        callback();
    };
    self.currTabName = ko.observable(route.values.query.Tab);
    self.setUrl = function () {
        newParam = { Tab: self.currTabName() };
        newParam[self.tome.qn] = self.tome.queried();
        newParam[self.sent.qn] = self.sent.queried();
        newParam[self.ccme.qn] = self.ccme.queried();
        var urlParams = utils.getCleanedEmpty(newParam);
        var url = location.pathname + '?' + $.param(urlParams, true) + location.hash;
        History.replaceState(null, null, url);
        document.title = self[self.currTabName()].title;
    };
    self.tome = { searchUrl: 'WorkflowMessage/TaskList' };
    self.sent = { searchUrl: 'WorkflowMessage/RequestList' };
    self.ccme = { searchUrl: 'WorkflowMessage/MessageList' };
    function tabCommon(tabName) {
        var tab = self[tabName];
        tab.qn = ({ tome: 'Utq', sent: 'Urq', ccme: 'Umq' }[tabName]);
        tab.title = ({ tome: '事项', sent: '申请', ccme: '消息' }[tabName]);
        tab.onSelect = function () {
            tab.select();
        };
        tab.select = function (callback) {
            self.currTabName(tabName);
            if (!tab.loaded()) {
                tab.initialize(callback);
            } else {
                self.setUrl();

                if (callback) {
                    callback();
                }
            }
        };
        tab.toquery = ko.mapping.fromJS(route.values.query[tab.qn]);
        tab.queried = ko.observable(ko.mapping.toJS(tab.toquery));
        tab.resultPagination = ko.observable({});

        tab.items = ko.observableArray();
        tab.loaded = ko.observable(false);
        tab.search = function (params, callback) {
            base._get(tab.searchUrl, utils.getCleanedEmpty(params), function (result) {
                tab.queried(params);
                self.setUrl();
                tab.fill(result);
                tab.loaded(true);
                if (callback) {
                    callback();
                }
            });
        };
        tab.fill = function (result) {
            var items = $.map(result.Data.list, function (r) {
                return ko.mapping.fromJS(r);
            });
            tab.items(items);
            tab.resultPagination(result.Data.pagination);
            base._pagination($('#pager-' + tabName), +tab.resultPagination().PageCount, +tab.resultPagination().TotalCount, +tab.queried().Pagination.CurrentPage, tab.changePage, +tab.resultPagination().PageSize);
        };
        tab.changePage = function (newPage, pageSize) {
            var params = tab.queried();
            var currPageSize = +tab.toquery.Pagination.PageSize();
            var newPageSize = +pageSize || +params.Pagination.PageSize;
            params.Pagination.PageSize = newPageSize;
            tab.toquery.Pagination.PageSize(newPageSize);
            params.Pagination.CurrentPage = newPageSize === currPageSize ? +newPage || +params.Pagination.CurrentPage : 1;
            tab.search(params);
        };
        tab.onSearch = function () {
            if (tab.toquery.Pagination && tab.toquery.Pagination.CurrentPage) {
                tab.toquery.Pagination.CurrentPage(1);
            }
            var params = ko.mapping.toJS(tab.toquery);
            tab.search(params);
        };
        tab.initialize = function (callback) {
            var params = ko.mapping.toJS(tab.toquery);
            tab.search(params, callback);
        };
        tab.reload = function (callback) {
            var params = tab.queried();
            tab.search(params, callback);
        };
    }
    tabCommon('tome');
    tabCommon('sent');
    tabCommon('ccme');
    (function (tabName) {
        var tab = self[tabName];

    })('tome');
    (function (tabName) {
        var tab = self[tabName];
        tab.onSubmit = function (item) {
            confirm('确定要提交？', function () {
                base._post('WorkflowMessage/RequestSubmit', { id: item.WFUserRequestId() }, function (result) {
                    tab.reload();
                    $(route.values[tabName].modalCancel).modal('hide');
                }, function (result) {
                    $(route.values[tabName].modalCancel).modal('hide');
                });
            });
        };
        tab.currItem = ko.observable();
        tab.cancelNote = ko.observable();
        tab.toCancel = function (item) {
            tab.currItem(item);
            tab.cancelNote('');
        };
        tab.onCancel = function () {
            confirm('确定要撤销？', function () {
                base._post('WorkflowMessage/RequestCancel', {
                    flowId: tab.currItem().ApprovalWFId(),
                    note: tab.cancelNote()
                }, function (result) {
                    tab.reload();
                    $(route.values[tabName].modalCancel).modal('hide');
                })
            }, function (result) {
                $(route.values[tabName].modalCancel).modal('hide');
            });
        }
    })('sent');
    (function (tabName) {
        var tab = self[tabName];
        tab.onSetRead = function () {
            confirm('确定都要设为已读？', function () {
                base._post('WorkflowMessage/MessageSetRead', tab.currQuery, function (result) {
                    tab.reload();
                })
            }, function () {
                $(route.values[tabName].modalCancel).modal('hide');
            });
        };
    })('ccme');
};
GMK.WorkflowMessage.RequestParamViewModel = function (plainData, route) {
    var self = $.extend(this, ko.mapping.fromJS(plainData));
    self.requireApprovalInfo = ko.computed(function () {
        var tmplId = self.ApprovalWFTemplateId();
        var tmpl = utils.find(route.values.approvalWorkflowTemplates, function (r) {
            return tmplId === r.WFApprovalWorkflowTemplateId;
        });
        return '合同类审批流程模版' === (tmpl || {}).Name;
    });
};
GMK.WorkflowMessage.RequestCreateViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    self.values = route.values;
    var base = GMK.Features.FeatureBase;
    self.itemContentType = ko.observable(commonModels.Enums.ContentType.Attachment);
    self.archive = {};
    self.hasArchive = ko.observable(false);
    self.archiveContent = ko.observable(null);
    self.templateId = null;
    (function (archive) {
        var contentContainer = '#generated';
        var acc = contentContainer;
        archive.step = ko.observable();
        archive.templates = ko.observableArray();
        archive.templateContent = ko.observable();
        archive.loadTemplates = function (callback) {
            base._get('Template/List', {
                TemplateType: route.values.templateType,
                CommodityId: route.values.commodityId,
                CorporationId: route.values.corporationId,
                IsGeneralBlank: self.itemContentType() === commonModels.Enums.ContentType.BlankTemplate
            }, function (result) {
                var data = $.map(result.Data, function (r) {
                    return new GMK.Template.ItemViewModel(r, commonModels);
                });
                archive.templates(data);
                if (callback) {
                    callback();
                }
            });
        };
        archive.onSelectTemplate = function (template) {
            archive.templateContent(null);
            archive.templateId = template.WFBillTemplateId();
            archive.step('generate-archive');
            archive.loadTemplate(template, function () {
                archive.loadDataSource(function (result) {
                    archive.generate(result.Data);
                });
            });
        };
        archive.generate = function (dataSource, callback) {
            var gvm = { dataSource: dataSource, commonModels: commonModels };
            var elem = $(contentContainer)[0];
            ko.cleanNode($(contentContainer)[0]);
            $(contentContainer).removeAttr('data-bind');
            ko.applyBindings(gvm, elem);
            GMK.Template.setRuler(acc);
            GMK.Template.startEdit(acc, $.extend({}, GMK.Template.tinymceInline2Options, { selector: acc + ' .editable.editable2' }));

            if (!self.hasArchive()) {
                archive.saveArchive(function () {
                    self.loadArchive(function () {
                        archive.step(null);
                    });
                });
            }
        };
        archive.loadTemplate = function (template, callback) {
            base._get('Template/Get', { id: template.WFBillTemplateId() }, function (result) {
                archive.templateContent(result.Data.HTMLContent);
                if (callback) {
                    callback();
                }
            });
        };
        archive.loadDataSource = function (callback) {
            base._get('Template/DataSourceGet', {
                templateType: route.values.templateType,
                dataSourceId: route.values.objectId,
            }, function (result) {
                if (callback) {
                    callback(result);
                }
            });
        };
        archive.saveArchive = function (callback) {

            GMK.Template.endEdit(acc);

            GMK.Template.generateMultipage(contentContainer);

            var content = $(contentContainer).html();
            var archiveData = {
                BillType: route.values.templateType,
                BillId: route.values.objectId,
                BillContent: content,
                WFBillTemplateId: archive.templateId
            };
            base._post('Template/ArchiveSave', archiveData, function (result) {
                if (callback) {
                    callback();
                }
            });
        };
        archive.toEdit = function () {
            archive.step('edit-archive');
            self.loadArchive(function () {
                $('.editable', contentContainer).removeAttr('id');
                GMK.Template.invMultipage(acc);
                GMK.Template.setRuler(acc);
                GMK.Template.startEdit(acc, $.extend({}, GMK.Template.tinymceInline2Options, { selector: acc + ' .editable.editable2' }));
            });
        };
        archive.toGenerate = function () {
            archive.step('select-template');
            archive.loadTemplates(function () {
                if (archive.templates().length === 1) {
                    archive.onSelectTemplate(archive.templates()[0]);
                }
            });
        };
        archive.onSave = function () {
            archive.saveArchive(function () {
                self.loadArchive(function () {
                    archive.step(null);
                });
            });
        };
        archive.onCancelEdit = function () {
            GMK.Template.endEdit(acc);

            archive.step(null);

            var hasBlankArchive = $('.general-blank', '#approval-archive').length;
            var archiveLoaded = self.archiveLoaded();
            var hasArchive = self.hasArchive();
            var ict = self.itemContentType();
            if (archiveLoaded && hasArchive) {
                if (ict === commonModels.Enums.ContentType.AutoGenerate) {
                    if (hasBlankArchive) {
                        self.itemContentTypeComputed(commonModels.Enums.ContentType.BlankTemplate);
                    }
                } else if (ict === commonModels.Enums.ContentType.BlankTemplate) {
                    if (!hasBlankArchive) {
                        self.itemContentTypeComputed(commonModels.Enums.ContentType.AutoGenerate);
                    }
                }
            }
        };
        archive.initialize = function (ict) {
            var hasBlankArchive = $('.general-blank', '#approval-archive').length;
            var archiveLoaded = self.archiveLoaded();
            var hasArchive = self.hasArchive();
            //var ict = self.itemContentType();
            if (archiveLoaded && (ict === commonModels.Enums.ContentType.AutoGenerate && (!hasArchive || hasBlankArchive) || ict === commonModels.Enums.ContentType.BlankTemplate && (!hasArchive || !hasBlankArchive))) {
                self.archive.toGenerate();
            }
        };
    })(self.archive);
    self.itemContentTypeComputed = ko.computed({
        read: self.itemContentType,
        write: function (newVal) {
            self.itemContentType(+newVal);
            self.archive.initialize(+newVal);
        }
    });
    //self.itemContentType.subscribe(function (newVal) {
    //    self.archive.initialize(+newVal);
    //});
    self.selectArchive = ko.computed(function () {
        return +self.itemContentType() === commonModels.Enums.ContentType.AutoGenerate || +self.itemContentType() === commonModels.Enums.ContentType.BlankTemplate;
    });
    self.itemContentTypeChangable = ko.computed(function () {
        return !(self.selectArchive() && self.archive.step());
    });

    self.attachments = ko.observableArray();

    self.mainAttachments = ko.observableArray();
    self.tempMainAttachments = ko.observableArray();
    self.normalAttachments = ko.observableArray();
    self.tempNormalAttachments = ko.observableArray();
    self.isSearchGlobal = ko.observable();
    self.isSelectMainAttachment = ko.observable();
    self.onRemoveMainAttachment = function (item) {
        self.mainAttachments.remove(item);
    };
    self.onRemoveTempMainAttachment = function (item) {
        self.tempMainAttachments.remove(item);
    };
    self.onRemoveNormalAttachment = function (item) {
        self.normalAttachments.remove(item);
    };
    self.onRemoveTempNormalAttachment = function (item) {
        self.tempNormalAttachments.remove(item);
    };
    self.onPreSelectMainAttachments = function () {
        self.isSelectMainAttachment(true);
        self.tempMainAttachments(self.mainAttachments.slice(0));
        self.onSearchAttachments();
    };
    self.onPreSelectNormalAttachments = function () {
        self.isSelectMainAttachment(false);
        self.tempNormalAttachments(self.normalAttachments.slice(0));
        self.onSearchAttachments();
    };
    self.onAddMainAttachments = function () {
        var details = $.map(self.attachments(), function (item) {
            return $.grep(item.WFContractBillArchiveDetails, function (elem) {
                var isSelected = elem.isSelected();
                if (isSelected) elem.isSelected(false);
                return isSelected && !isExist(elem, self.tempMainAttachments());
            });
        });
        self.tempMainAttachments.push.apply(self.tempMainAttachments, details);
    };
    self.onAddNormalAttachments = function () {
        var details = $.map(self.attachments(), function (item) {
            return $.grep(item.WFContractBillArchiveDetails, function (elem) {
                return elem.isSelected() && !isExist(elem, self.tempNormalAttachments());
            });
        });
        self.tempNormalAttachments.push.apply(self.tempNormalAttachments, details);
    };

    function isExist(item, list) {
        var isexist = false;
        $.each(list, function (i, r) {
            if (item.id() == r.id()) {
                isexist = true;
                return false;
            }
        });
        return isexist;
    };

    self.onSaveAttachments = function () {
        self.mainAttachments(self.tempMainAttachments.slice(0));
        self.normalAttachments(self.tempNormalAttachments.slice(0));
    };
    self.redirectUrl = $.url().param('redirect');
    self.isEdit = route.values.isEdit;
    self.param = {};
    self.paramRequireApprovalInfo = ko.computed(function () {
        var result = false;
        if (self.param.ApprovalWFTemplateId) {
            var tmplId = self.param.ApprovalWFTemplateId();
            var tmpl = utils.find(route.values.approvalWorkflowTemplates, function (r) {
                return tmplId === r.WFApprovalWorkflowTemplateId;
            });
            if (tmpl) {
                result = '合同类审批流程模版' === tmpl.Name;
            }
        }
        return result;
    });
    self.id = route.values.id;
    self.note = ko.observable('');
    self.objectId = ko.observable(route.values.objectId);
    //self.otherContentSelectable = ko.observable(route.values.otherContentSelectable);
    self.otherContentSelectable = ko.observable(true);
    self.attachmentUrl = ko.observable(route.values.attachmentUrl);
    self.flowType = ko.observable();

    self.achiveUrl = ko.computed(function () {
        return route.values.templateType !== null ? 'Template/ArchiveGenerate?' + $.param({ templateType: route.values.templateType, dataSourceId: route.values.objectId, commodityId: route.values.commodityId }) : null;
    });
    self.initialize = function (callback) {
        self.flowType(route.values.flowType);

        var url = self.isEdit
            ? route.requestEditUrl + '?' + $.param({ redirect: self.redirectUrl })
            : route.requestCreateUrl + '?' + $.param({ objectId: route.values.objectId, flowType: route.values.flowType, commodityId: route.values.commodityId, redirect: self.redirectUrl });
        History.replaceState(null, null, url);

        self.loadItem(function () {
            self.loadArchive(function () {
                    callback();
                    if (!self.isEdit) {
                        self.getNewRequestDefaultItemContentType(function (ict) {
                            self.itemContentTypeComputed(ict);
                        });
                    } else {
                        self.archive.initialize(self.itemContentType());
                    }
                });
            });
    };
    self.getNewRequestDefaultItemContentType = function (callback) {
        if (self.flowType() === commonModels.Enums.ApprovalType.Contract) {
            base._get('Contract/Get', { id: route.values.objectId }, function (result) {
                if (result.WFFirePriceContractId != null) {
                    // 包含长单点价
                    callback(commonModels.Enums.ContentType.BlankTemplate);
                } else {
                    callback(commonModels.Enums.ContentType.AutoGenerate);
                }
            });
        } else if (self.flowType() === commonModels.Enums.ApprovalType.OtherForm) {
            callback(commonModels.Enums.ContentType.Attachment);
        } else {
            callback(commonModels.Enums.ContentType.AutoGenerate);
        }
    };
    self.loadItem = function (callback) {
        if (self.isEdit) {
            base._get('WorkflowMessage/RequestGet', { id: self.id }, function (result) {
                self.objectId(result.Data.item.ObjectId);
                self.flowType(result.Data.item.ObjectType);
                self.note(result.Data.item.Note);
                self.itemContentType(result.Data.item.ApprovalWF.ContentType);
                var attachmentIds = $.map(result.Data.item.ApprovalWF.WFApprovalAttachments, function (attachment) {
                    return attachment.AttachmentId;
                });
                var mainAttachmentIds = $.map($.grep(result.Data.item.ApprovalWF.WFApprovalAttachments, function (r) {
                    return r.IsMainContent;
                }), function (r) {
                    return r.AttachmentId;
                });
                var normalAttachmentIds = $.map($.grep(result.Data.item.ApprovalWF.WFApprovalAttachments, function (r) {
                    return !r.IsMainContent;
                }), function (r) {
                    return r.AttachmentId;
                });
                if (attachmentIds.length) {
                    setTimeout(function () {
                        var oldValue = $.ajaxSettings.traditional;
                        $.ajaxSettings.traditional = true;
                        base._get('Attachment/ListAttachmentFileByIds', { ids: attachmentIds }, function (data) {
                            self.mainAttachments($.map($.grep(data.Data, function (r) {
                                return mainAttachmentIds.indexOf(r.WFContractBillArchiveDetailId) >= 0;
                            }), function(attachment) {
                                return new GMK.Attachment.AttachmentFileViewModel(attachment, attachment.WFContractBillArchive, route);
                            }));
                            self.normalAttachments($.map($.grep(data.Data, function (r) {
                                return normalAttachmentIds.indexOf(r.WFContractBillArchiveDetailId) >= 0;
                            }), function (attachment) {
                                return new GMK.Attachment.AttachmentFileViewModel(attachment, attachment.WFContractBillArchive, route);
                }));
                        });
                        $.ajaxSettings.traditional = oldValue;
                    }, 0);
                }
                self.param = new GMK.WorkflowMessage.RequestParamViewModel(result.Data.param, route);
                if (callback) {
                    callback();
                }
            });
        } else {
            self.param = new GMK.WorkflowMessage.RequestParamViewModel(route.values.newParam, route);
            if (callback) {
                callback();
            }
        }
    };
    self.archiveLoaded = ko.observable(false);
    self.loadArchive = function (callback) {
        if (self.selectArchive() || self.otherContentSelectable()) {
            base._get('Template/ArchiveGet', { templateType: route.values.templateType, dataSourceId: route.values.objectId }, function (result) {
                if (result.Data) {
                    self.archiveContent(result.Data.BillContent);
                    self.hasArchive(true);
                } else {
                    self.archiveContent(null);
                    self.hasArchive(false);
                }
                self.archiveLoaded(true);
                if (callback) {
                    callback();
                }
            });
        } else {
            self.archiveLoaded(true);
            if (callback) {
                callback();
            }
        }
    };
    self.onSearchAttachments = function () {
        var qs = utils.serialize('#SelectAttachmentsModal .gmk-data-field');
        if (!qs.IsSearchGlobal) {
            qs.ObjectId = route.values.objectId;
            qs.ObjectType = route.values.objectType;
        }
        base._get('Attachment/ListQuery', qs, function (result) {
            self.fillAttachment(result.Data.list);
        });
    };
    self.fillAttachment = function (plainData) {
        $.each(plainData, function (i, r1) {
            r1.WFContractBillArchiveDetails = $.map(r1.WFContractBillArchiveDetails, function (r2) {
                var result = new GMK.Attachment.AttachmentFileViewModel(r2, r1, route);
                result.isSelected = ko.observable();
                return result;
            });
        });
        self.attachments(plainData);
    };
    self.onReloadArchive = function () {
        self.loadArchive();
    };
    self.toJs = function () {
        var param = ko.mapping.toJS(self.param);
        param.ItemContentType = self.itemContentType();
        param.MainContentAttachmentList = self.selectArchive() ? [] : $.map(self.mainAttachments(), function (item) {
            return item.id();
        });
        param.AttachmentIdList = $.map(self.normalAttachments(), function (item) {
            return item.id();
        });
        param.Comment = self.note();
        return {
            id: self.id,
            param: param
        };
    };
    self.save = function (saveUrl, callback, ignoreWarning) {
        if (self.selectArchive()) {
            self.mainAttachments.removeAll();
        }
        var data = self.toJs();
        if (data.param.ItemContentType == commonModels.Enums.ContentType.Attachment && !data.param.MainContentAttachmentList.length) {
            alert('请选择主附件');
            return;
        }
        if (ignoreWarning) data.ignoreWarning = ignoreWarning;
        base._post(saveUrl, data, function (result) {
            if (result.ReturnStatus == 2 || result.ReturnStatus == 4) {
                var message = '<div style="text-align:left;">{0}<ul style="list-style-type:decimal">{1}</ul><p>仍然继续提交？</p></div>';
                var messageDetails = $.map(result.Data, function (msg) {
                    return '<li>{0}</li>'.format(msg);
                });
                confirm(message.format(result.Message, messageDetails.join('')), function () {
                    self.save(saveUrl, callback, true);
                });
            } else {
            if (callback) {
                callback(result);
            }
            }
        });
    };
    self.onSave = function () {
        var url = 'WorkflowMessage/' + (self.isEdit ? 'RequestUpdate' : 'RequestCreate');
        self.save(url, function (result) {
            var redirectUrl = self.redirectUrl || 'WorkflowMessage/Index?tab=sent';
            if (redirectUrl[0] !== '/') {
                redirectUrl = redirectUrl;
            }
            location.href = redirectUrl;
        });
    };
    self.onSaveAndSubmit = function () {
        var url = 'WorkflowMessage/' + (self.isEdit ? 'RequestUpdateAndSubmit' : 'RequestCreateAndSubmit');
        self.save(url, function (result) {
            var redirectUrl = self.redirectUrl || 'WorkflowMessage/Index?tab=sent';
            if (redirectUrl[0] !== '/') {
                redirectUrl = redirectUrl;
            }
            location.href = redirectUrl;
        });
    };
    self.onSaveArchiveAndSave = function () {
        self.archive.saveArchive(function () {
            self.onSave();
        });
    };
    self.onSaveArchiveAndSaveAndSubmit = function () {
        self.archive.saveArchive(function () {
            self.onSaveAndSubmit();
        });
    };
};
