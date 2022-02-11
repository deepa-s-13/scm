import { Card, CardSubHeader, Header, LinkButton, Loader, Row, StatusTable } from "@egovernments/digit-ui-react-components";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import getPTAcknowledgementData from "../../getPTAcknowledgementData";
import PropertyDocument from "../../pageComponents/PropertyDocument";
import PTWFApplicationTimeline from "../../pageComponents/PTWFApplicationTimeline";
import { getCityLocale, getPropertyTypeLocale, propertyCardBodyStyle,getMohallaLocale } from "../../utils";
import ApplicationDetailsActionBar from "../../../../templates/ApplicationDetails/components/ApplicationDetailsActionBar";
import ActionModal from "../../../../templates/ApplicationDetails/Modal";
import { newConfigMutate } from "../../config/Mutate/config";
import _ from "lodash";
import get from "lodash/get";

const MutationApplicationDetails = ({acknowledgementIds, workflowDetails}) => {
  const { t } = useTranslation();
  const [acknowldgementData, setAcknowldgementData] = useState([]);
  const [displayMenu, setDisplayMenu] = useState(false);
  const tenantId = Digit.ULBService.getCurrentTenantId();
  const state = Digit.ULBService.getStateId();
  const { data: storeData } = Digit.Hooks.useStore.getInitData();
  const { tenants } = storeData || {};
  const [businessService, setBusinessService] = useState("PT.CREATE");
  const { isLoading, isError, error, data } = Digit.Hooks.pt.usePropertySearch(
    { filters: { acknowledgementIds },tenantId },
    { filters: { acknowledgementIds },tenantId }
  );

  const properties = get(data, "Properties", []);
  const propertyId = get(data, "Properties[0].propertyId", []);
  let property = (properties && properties.length > 0 && properties[0]) || {};
  const application = propertyId;
  sessionStorage.setItem("pt-property", JSON.stringify(application));

  const { isLoading: auditDataLoading, isError: isAuditError, data: auditResponse } = Digit.Hooks.pt.usePropertySearch(
    {
      tenantId,
      filters: { propertyIds: propertyId, audit: true },
    },
    {
      enabled: true,
       // select: (d) =>
      //   d.Properties.filter((e) => e.status === "ACTIVE")?.sort((a, b) => b.auditDetails.lastModifiedTime - a.auditDetails.lastModifiedTime),
      // select: (data) => data.Properties?.filter((e) => e.status === "ACTIVE")
    }
  );

  const [appDetailsToShow, setAppDetailsToShow] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const { isLoading: isLoadingApplicationDetails, isError: isErrorApplicationDetails, data: applicationDetails, error: errorApplicationDetails } = Digit.Hooks.pt.useApplicationDetail(t, tenantId, propertyId);

  useEffect(() => {
    showTransfererDetails();
  }, [auditResponse, applicationDetails, appDetailsToShow]);

  useEffect(() => {
    if (applicationDetails) {
      setAppDetailsToShow(_.cloneDeep(applicationDetails));
    }
  }, [applicationDetails]);

  const showTransfererDetails = () => {
    if (
      auditResponse &&
      Object.keys(appDetailsToShow).length &&
      applicationDetails?.applicationData?.status !== "ACTIVE" &&
      applicationDetails?.applicationData?.creationReason === "MUTATION" &&
      !appDetailsToShow?.applicationDetails.find((e) => e.title === "PT_MUTATION_TRANSFEROR_DETAILS")
    ) {
      let applicationDetails = appDetailsToShow.applicationDetails?.filter((e) => e.title === "PT_OWNERSHIP_INFO_SUB_HEADER");
      let compConfig = newConfigMutate.reduce((acc, el) => [...acc, ...el.body], []).find((e) => e.component === "TransfererDetails");
      applicationDetails.unshift({
        title: "PT_MUTATION_TRANSFEROR_DETAILS",
        belowComponent: () => <TransfererDetails userType="employee" formData={{ originalData: auditResponse[0] }} config={compConfig} />,
      });
      setAppDetailsToShow({ ...appDetailsToShow, applicationDetails });
    }
  };

  const submitAction = async (data, nocData = false) => {
    if (typeof data?.customFunctionToExecute === "function") {
      data?.customFunctionToExecute({ ...data });
    }
    if (nocData !== false && nocMutation) {
      const nocPrmomises = nocData?.map(noc => {
        return nocMutation?.mutateAsync(noc)
      })
      try {
        const values = await Promise.all(nocPrmomises);
        values && values.map((ob) => {
          Digit.SessionStorage.del(ob?.Noc?.[0]?.nocType);
        })
      }
      catch (err) {
        closeModal();
        return;
      }
    }
    if (mutate) {
      mutate(data, {
        onError: (error, variables) => {
          setShowToast({ key: "error", error });
          setTimeout(closeToast, 5000);
        },
        onSuccess: (data, variables) => {
          setShowToast({ key: "success", action: selectedAction });
          setTimeout(closeToast, 5000);
          queryClient.clear();
          queryClient.refetchQueries("APPLICATION_SEARCH");
        },
      });
    }

    closeModal();
  };

  const closeModal = () => {
    setSelectedAction(null);
    setShowModal(false);
  };

  function onActionSelect(action) {
    if (action) {
      if (action?.redirectionUrll) {
        window.location.assign(`${window.location.origin}/digit-ui/employee/payment/collect/${action?.redirectionUrll?.pathname}`);
      } else if (!action?.redirectionUrl) {
        setShowModal(true);
      } else {
        history.push({
          pathname: action.redirectionUrl?.pathname,
          state: { ...action.redirectionUrl?.state },
        });
      }
    } else console.debug("no action found");

    setSelectedAction(action);
    setDisplayMenu(false);
  }

  if (!property.workflow) {
    let workflow = {
      id: null,
      tenantId: tenantId,
      businessService: "PT.MUTATION",
      businessId: application?.acknowldgementNumber,
      action: "",
      moduleName: "PT",
      state: null,
      comment: null,
      documents: null,
      assignes: null
    };
    property.workflow = workflow;

  }

  if (property && property.owners && property.owners.length > 0) {
    let ownersTemp = [];
    let owners = [];
    property.owners.map(owner => {
      owner.documentUid = owner.documents ? owner.documents[0].documentUid : "NA";
      owner.documentType = owner.documents ? owner.documents[0].documentType : "NA";
      if (owner.status == "ACTIVE") {
        ownersTemp.push(owner);
      } else {
        owners.push(owner);
      }
    });

    property.ownersInit = owners;
    property.ownersTemp = ownersTemp;
  }
  property.ownershipCategoryTemp = property.ownershipCategory;
  property.ownershipCategoryInit = 'NA';
  // Set Institution/Applicant info card visibility
  if (
    get(
      application,
      "Properties[0].ownershipCategory",
      ""
    ).startsWith("INSTITUTION")
  ) {
    property.institutionTemp = property.institution;
  }

  if (auditResponse && Array.isArray(get(auditResponse, "Properties", [])) && get(auditResponse, "Properties", []).length > 0) {
    const propertiesAudit = get(auditResponse, "Properties", []);
    const propertyIndex=property.status ==  'ACTIVE' ? 1:0;
    // const previousActiveProperty = propertiesAudit.filter(property => property.status == 'ACTIVE').sort((x, y) => y.auditDetails.lastModifiedTime - x.auditDetails.lastModifiedTime)[propertyIndex];
    // Removed filter(property => property.status == 'ACTIVE') condition to match result in qa env
    const previousActiveProperty = propertiesAudit.sort((x, y) => y.auditDetails.lastModifiedTime - x.auditDetails.lastModifiedTime)[propertyIndex];
    property.ownershipCategoryInit = previousActiveProperty.ownershipCategory;
    property.ownersInit = previousActiveProperty.owners.filter(owner => owner.status == "ACTIVE");

    if (property.ownershipCategoryInit.startsWith("INSTITUTION")) {
      property.institutionInit = previousActiveProperty.institution;
    }
  }

  let transfereeOwners = get(
    property,
    "ownersTemp", []
  );
  let transferorOwners = get(
    property,
    "ownersInit", []
  );

  let transfereeInstitution = get(
    property,
    "institutionTemp", []
  );
  
  let transferorInstitution = get(
    property,
    "institutionInit", []
    );
    
  let units = [];
  units = application?.units;
  units &&
    units.sort((x, y) => {
      let a = x.floorNo,
        b = y.floorNo;
      if (x.floorNo < 0) {
        a = x.floorNo * -20;
      }
      if (y.floorNo < 0) {
        b = y.floorNo * -20;
      }
      if (a > b) {
        return 1;
      } else {
        return -1;
      }
    });
  let owners = [];
  owners = application?.owners;
  let docs = [];
  docs = application?.documents;
  if (isLoading || auditDataLoading) {
    return <Loader />;
  }

  let flrno,
    i = 0;
  flrno = units && units[0]?.floorNo;

 // const isPropertyTransfer = property?.creationReason && property.creationReason === "MUTATION" ? true : false;

  const getAcknowledgementData = async () => {
    const applications = application || {};
    const tenantInfo = tenants.find((tenant) => tenant.code === applications.tenantId);
    const acknowldgementDataAPI = await getPTAcknowledgementData({ ...applications }, tenantInfo, t);
    setAcknowldgementData(acknowldgementDataAPI);
  }
  // useEffect(() => {
    getAcknowledgementData();
  // }, [])

  const handleDownloadPdf = () => {
    Digit.Utils.pdf.generate(acknowldgementData);
  };

  let documentDate = t("CS_NA");
  if(property?.additionalDetails?.documentDate) {
    const date = new Date(property?.additionalDetails?.documentDate);
    const month = Digit.Utils.date.monthNames[date.getMonth()];
    documentDate = `${date.getDate()} ${month} ${date.getFullYear()}`;
  }

  return (
    <React.Fragment>
      <Header>{t("PT_MUTATION_APPLICATION_DETAILS")}</Header>
      <div>
            <div>
               <LinkButton label={t("CS_COMMON_DOWNLOAD")} className="check-page-link-button pt-application-download-btn" onClick={handleDownloadPdf} />
            </div>
        <Card>
           <StatusTable>
             <Row label={t("PT_APPLICATION_NUMBER_LABEL")} text={property?.acknowldgementNumber} textStyle={{ whiteSpace: "pre" }} />
             <Row label={t("PT_SEARCHPROPERTY_TABEL_PTUID")} text={property?.propertyId} textStyle={{ whiteSpace: "pre" }} />
             <Row label={t("PT_APPLICATION_CHANNEL_LABEL")} text={t(`ES_APPLICATION_DETAILS_APPLICATION_CHANNEL_${property?.channel}`)} />
             <Row label={t("PT_FEE_AMOUNT")} text={application?.name ||t("CS_NA") } textStyle={{ whiteSpace: "pre" }} />
             <Row label={t("PT_PAYMENT_STATUS")} text={application?.status ||t("CS_NA")} textStyle={{ whiteSpace: "pre" }} />
            
          </StatusTable>
                 <CardSubHeader>{t("PT_PROPERTY_ADDRESS_SUB_HEADER")}</CardSubHeader>
          <StatusTable>
              <Row label={t("PT_PROPERTY_ADDRESS_PINCODE")} text={property?.address?.pincode || t("CS_NA")} />
              <Row label={t("PT_COMMON_CITY")} text={property?.address?.city || t("CS_NA")} />
              <Row label={t("PT_COMMON_LOCALITY_OR_MOHALLA")} text=/* {`${t(application?.address?.locality?.name)}` || t("CS_NA")} */{t(`${(property?.address?.locality?.area)}`) || t("CS_NA")} />
              <Row label={t("PT_PROPERTY_ADDRESS_STREET_NAME")} text={property?.address?.street || t("CS_NA")} />
              <Row label={t("PT_DOOR_OR_HOUSE")} text={property?.address?.doorNo || t("CS_NA")} />
         
          </StatusTable>

              <CardSubHeader>{t("PT_MUTATION_TRANSFEROR_DETAILS")}</CardSubHeader>
              <div>
                {Array.isArray(transferorOwners) &&
                  transferorOwners.map((owner, index) => (
                    <div key={index}>
                      <CardSubHeader>
                        {transferorOwners.length != 1 && (
                          <span>
                            {t("PT_OWNER_SUB_HEADER")} - {index + 1}{" "}
                          </span>
                        )}
                      </CardSubHeader>
                      <StatusTable>
                        <Row label={t("PT_COMMON_APPLICANT_NAME_LABEL")} text={owner?.name || t("CS_NA")} />
                        <Row label={t("Guardian Name")} text={owner?.fatherOrHusbandName || t("CS_NA")} />   
                        <Row label={t("PT_FORM3_MOBILE_NUMBER")} text={owner?.mobileNumber || t("CS_NA")} />
                        <Row label={t("PT_MUTATION_AUTHORISED_EMAIL")} text={owner?.emailId || t("CS_NA")} />
                        <Row label={t("PT_MUTATION_TRANSFEROR_SPECIAL_CATEGORY")} text={ owner?.ownerType.toLowerCase() || t("CS_NA")} />
                        <Row label={t("PT_OWNERSHIP_INFO_CORR_ADDR")} text={owner?.correspondenceAddress || t("CS_NA")} />
                      </StatusTable>
                    </div>
                  ))}
              </div>

              <CardSubHeader>{t("PT_MUTATION_TRANSFEREE_DETAILS")}</CardSubHeader>
               {
                transferorInstitution ? (
                  <div>
                    {Array.isArray(transfereeOwners) &&
                      transfereeOwners.map((owner, index) => (
                        <div key={index}>
                          <CardSubHeader>
                            {transfereeOwners.length != 1 && (
                              <span>
                                {t("PT_OWNER_SUB_HEADER")} - {index + 1}{" "}
                              </span>
                            )}
                          </CardSubHeader>
                          <StatusTable>
                            <Row label={t("PT_INSTITUTION_NAME")} text={transferorInstitution?.name || t("CS_NA")} />
                            <Row label={t("PT_TYPE_OF_INSTITUTION ")} text={`${t(transferorInstitution?.type)}` || t("CS_NA")} />
                            <Row label={t("PT_NAME_AUTHORIZED_PERSON")} text={transferorInstitution?.nameOfAuthorizedPerson || t("CS_NA")} />
                            <Row label={t("PT_LANDLINE_NUMBER")} text={owner?.altContactNumber || t("CS_NA")} />
                            <Row label={t("PT_FORM3_MOBILE_NUMBER")} text={owner?.mobileNumber || t("CS_NA")} />
                            <Row label={t("PT_INSTITUTION_DESIGNATION")} text={transferorInstitution?.designation || t("CS_NA")} />
                            <Row label={t("PT_MUTATION_AUTHORISED_EMAIL")} text={owner?.emailId || t("CS_NA")} />
                            <Row label={t("PT_OWNERSHIP_INFO_CORR_ADDR")} text={owner?.correspondenceAddress || t("CS_NA")} />
                          </StatusTable>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div>
                    {Array.isArray(transferorOwners) &&
                      transferorOwners.map((owner, index) => (
                        <div key={index}>
                          <CardSubHeader>
                            {transferorOwners.length != 1 && (
                              <span>
                                {t("PT_OWNER_SUB_HEADER")} - {index + 1}{" "}
                              </span>
                            )}
                          </CardSubHeader>
                          <StatusTable>
                            <Row label={t("PT_COMMON_APPLICANT_NAME_LABEL")} text={owner?.name || t("CS_NA")} />
                            <Row label={t("PT_COMMON_GENDER_LABEL")} text={owner?.gender || t("CS_NA")} />
                            <Row label={t("PT_FORM3_MOBILE_NUMBER")} text={owner?.mobileNumber || t("CS_NA")} />
                            <Row label={t("PT_FORM3_GUARDIAN_NAME")} text={owner?.fatherOrHusbandName || t("CS_NA")} />
                            <Row label={t("PT_RELATIONSHIP")} text={owner?.relationship || t("CS_NA")} />
                            <Row label={t("PT_MUTATION_AUTHORISED_EMAIL")}text={owner?.emailId || t("CS_NA")} />
                            <Row label={t("PT_OWNERSHIP_INFO_CORR_ADDR")} text={owner?.correspondenceAddress || t("CS_NA")} />
                            <Row label={t("PT_MUTATION_TRANSFEROR_SPECIAL_CATEGORY")} text={(owner?.ownerType).toLowerCase() || t("CS_NA")} />
                            <Row
                              label={t("PT_FORM3_OWNERSHIP_TYPE")}
                              text={`${application?.ownershipCategory ? t(`PT_OWNERSHIP_${owner?.ownershipCategory}`) : t("CS_NA")}`}
                            />
                          </StatusTable>
                        </div>
                    ))}
                  </div>
                       )
                   }
                   <CardSubHeader>{t("PT_MUTATION_DETAILS")}</CardSubHeader>
                      <StatusTable>
                        <Row label={t("PT_MUTATION_PENDING_COURT")} text={property?.additionalDetails?.isMutationInCourt || t("CS_NA")} />
                        <Row label={t("PT_DETAILS_COURT_CASE")} text={property?.additionalDetails?.caseDetails || t("CS_NA")}  />
                        <Row label={t("PT_PROP_UNDER_GOV_AQUISITION")} text={property?.additionalDetails?.isPropertyUnderGovtPossession || t("CS_NA")}  />
                        <Row label={t("PT_DETAILS_GOV_AQUISITION")} text={t("CS_NA")}  />
                      </StatusTable>
                  
                   <CardSubHeader>{t("PT_REGISTRATION_DETAILS")}</CardSubHeader>
                     <StatusTable>
                        <Row label={t("PT_REASON_PROP_TRANSFER")} text={`${t(property?.additionalDetails?.reasonForTransfer) }` || t("CS_NA")} />
                        <Row label={t("PT_PROP_MARKET_VALUE")} text={property?.additionalDetails?.marketValue || t("CS_NA")} />
                        <Row label={t("PT_REG_NUMBER")} text={property?.additionalDetails?.documentNumber || t("CS_NA")} />
                        <Row label={t("PT_DOC_ISSUE_DATE")} text={documentDate} />
                        <Row label={t("PT_REG_DOC_VALUE")} text={property?.additionalDetails?.documentValue || t("CS_NA")} />
                        <Row label={t("PT_REMARKS")} text={t("CS_NA")} />
                     </StatusTable>
          
          <CardSubHeader>{t("PT_COMMON_DOCS")}</CardSubHeader>
          <div>
            {Array.isArray(docs) ? (
              docs.length > 0 && <PropertyDocument property={property}></PropertyDocument>
            ) : (
              <StatusTable>
                <Row text="PT_NO_DOCUMENTS_MSG" />
              </StatusTable>
            )}
          </div>
          <PTWFApplicationTimeline application={application} id={acknowledgementIds} />
          {showModal ? (
            <ActionModal
              t={t}
              action={selectedAction}
              tenantId={tenantId}
              state={state}
              id={acknowledgementIds}
              applicationDetails={appDetailsToShow}
              applicationData={appDetailsToShow?.applicationData}
              closeModal={closeModal}
              submitAction={submitAction}
              actionData={workflowDetails?.data?.timeline}
              businessService={businessService}
              workflowDetails={workflowDetails}
              moduleCode="PT"
            />
          ) : null}
          <ApplicationDetailsActionBar
            workflowDetails={workflowDetails}
            displayMenu={displayMenu}
            onActionSelect={onActionSelect}
            setDisplayMenu={setDisplayMenu}
            businessService={businessService}
            forcedActionPrefix={"WF_EMPLOYEE_PT.CREATE"}
          />
        </Card>
      </div>
      
    </React.Fragment>
  );
};

export default MutationApplicationDetails;