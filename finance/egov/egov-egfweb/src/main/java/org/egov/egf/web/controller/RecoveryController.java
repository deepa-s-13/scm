package org.egov.egf.web.controller;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import javax.validation.Valid;

import org.egov.commons.CChartOfAccounts;
import org.egov.commons.dao.ChartOfAccountsDAO;
import org.egov.commons.service.AccountdetailtypeService;
import org.egov.commons.service.ChartOfAccountsService;
import org.egov.egf.web.adaptor.RecoveryJsonAdaptor;
import org.egov.model.recoveries.Recovery;
import org.egov.model.service.RecoveryService;
import org.egov.services.masters.BankService;
import org.egov.services.masters.EgPartyTypeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.MessageSource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

@Controller
@RequestMapping("/recovery")
public class RecoveryController {
    private final static String RECOVERY_NEW = "recovery-new";
    private final static String RECOVERY_RESULT = "recovery-result";
    private final static String RECOVERY_EDIT = "recovery-edit";
    private final static String RECOVERY_VIEW = "recovery-view";
    private final static String RECOVERY_SEARCH = "recovery-search";
    @Autowired
    @Qualifier("recoveryService")
    private RecoveryService recoveryService;
    @Autowired
    private MessageSource messageSource;
    @Autowired
    @Qualifier("chartOfAccountsService")
    private ChartOfAccountsService chartOfAccountsService;
    @Autowired
    @Qualifier("bankService")
    private BankService bankService;
    @Autowired
    @Qualifier("egPartyTypeService")
    private EgPartyTypeService egPartyTypeService;
    @Autowired
    private ChartOfAccountsDAO chartOfAccountsDAO;
    @Autowired
    private AccountdetailtypeService accountdetailtypeService;

    private void prepareNewForm(Model model) {
        model.addAttribute("chartOfAccountss", Collections.EMPTY_LIST);
        model.addAttribute("chartOfAccounts", chartOfAccountsDAO.getForRecovery());
        model.addAttribute("egPartytypes", egPartyTypeService.findAll());
        model.addAttribute("banks", bankService.findAll());
    }

    @RequestMapping(value = "/new", method = RequestMethod.GET)
    public String newForm(final Model model) {
        prepareNewForm(model);
        model.addAttribute("recovery", new Recovery());
        return RECOVERY_NEW;
    }

    @RequestMapping(value = "/create", method = RequestMethod.POST)
    public String create(@Valid @ModelAttribute final Recovery recovery, final BindingResult errors, final Model model,
            final RedirectAttributes redirectAttrs) {
        if (errors.hasErrors()) {
            prepareNewForm(model);
            return RECOVERY_NEW;
        }
        if (recovery.getBank() != null && recovery.getBank().getId() != null)
            recovery.setBank(bankService.findById(recovery.getBank().getId(), false));
        else
            recovery.setBank(null);
       
        recovery.setChartofaccounts(chartOfAccountsService.findById(recovery.getChartofaccounts().getId(), false));
        recovery.setEgPartytype(egPartyTypeService.findById(recovery.getEgPartytype().getId(), false));
        recoveryService.create(recovery);
        redirectAttrs.addFlashAttribute("message", messageSource.getMessage("msg.recovery.success", null, null));
        return "redirect:/recovery/result/" + recovery.getId();
    }

    @RequestMapping(value = "/edit/{id}", method = RequestMethod.GET)
    public String edit(@PathVariable("id") final Long id, Model model) {
        Recovery recovery = recoveryService.findOne(id);
        if (recovery.getBank() != null && recovery.getBank().getId() != null)
            recovery.setBankLoan(true);
        List<CChartOfAccounts> coas = new ArrayList<CChartOfAccounts>();
        coas.add(chartOfAccountsService.findById(recovery.getChartofaccounts().getId(), false));
        prepareNewForm(model);
        model.addAttribute("chartOfAccountss",coas);
        model.addAttribute("recovery", recovery);
        return RECOVERY_EDIT;
    }

    @RequestMapping(value = "/update", method = RequestMethod.POST)
    public String update(@Valid @ModelAttribute final Recovery recovery, final BindingResult errors, final Model model,
            final RedirectAttributes redirectAttrs) {
        if (errors.hasErrors()) {
            prepareNewForm(model);
            return RECOVERY_EDIT;
        }
        if (recovery.getBank() != null && recovery.getBank().getId() != null)
            recovery.setBank(bankService.findById(recovery.getBank().getId(), false));
        else
            recovery.setBank(null);
        recovery.setChartofaccounts(chartOfAccountsService.findById(recovery.getChartofaccounts().getId(), false));
        recovery.setEgPartytype(egPartyTypeService.findById(recovery.getEgPartytype().getId(), false));
        recoveryService.update(recovery);
        redirectAttrs.addFlashAttribute("message", messageSource.getMessage("msg.recovery.success", null, null));
        return "redirect:/recovery/result/" + recovery.getId();
    }

    @RequestMapping(value = "/view/{id}", method = RequestMethod.GET)
    public String view(@PathVariable("id") final Long id, Model model) {
        Recovery recovery = recoveryService.findOne(id);
        if (recovery.getBank() != null && recovery.getBank().getId() != null)
            recovery.setBankLoan(true);
        prepareNewForm(model);
        model.addAttribute("recovery", recovery);
        return RECOVERY_VIEW;
    }

    @RequestMapping(value = "/result/{id}", method = RequestMethod.GET)
    public String result(@PathVariable("id") final Long id, Model model) {
        Recovery recovery = recoveryService.findOne(id);
        model.addAttribute("recovery", recovery);
        return RECOVERY_RESULT;
    }

    @RequestMapping(value = "/search/{mode}", method = RequestMethod.GET)
    public String search(@PathVariable("mode") final String mode, Model model)
    {
        Recovery recovery = new Recovery();
        prepareNewForm(model);
        model.addAttribute("recovery", recovery);
        return RECOVERY_SEARCH;

    }

    @RequestMapping(value = "/ajaxsearch/{mode}", method = RequestMethod.POST, produces = MediaType.TEXT_PLAIN_VALUE)
    public @ResponseBody String ajaxsearch(@PathVariable("mode") final String mode, Model model,
            @ModelAttribute final Recovery recovery)
    {
        if (recovery != null && recovery.getChartofaccounts().getId() != null)
            recovery.setChartofaccounts(chartOfAccountsService.findById(recovery.getChartofaccounts().getId(), false));
        List<Recovery> searchResultList = recoveryService.search(recovery);
        String result = new StringBuilder("{ \"data\":").append(toSearchResultJson(searchResultList)).append("}").toString();
        return result;
    }

    @RequestMapping(value = "/ajax/getAccountCodes", method = RequestMethod.GET)
    public @ResponseBody List<CChartOfAccounts> getAccountCodes(@RequestParam("subLedgerCode") String subLedgerCode) {
        List<CChartOfAccounts> accounts = chartOfAccountsDAO.getBySubLedgerCode(subLedgerCode);
        return accounts;
    }

    public Object toSearchResultJson(final Object object)
    {
        final GsonBuilder gsonBuilder = new GsonBuilder();
        final Gson gson = gsonBuilder.registerTypeAdapter(Recovery.class, new RecoveryJsonAdaptor()).create();
        final String json = gson.toJson(object);
        return json;
    }
}