import { Banner, Card, CardText, SubmitBar, ActionBar } from "@egovernments/digit-ui-react-components";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import getPDFData from "../../utils/getWSAcknowledgementData";
import { useHistory } from "react-router-dom";
import * as func from "../../utils";


const WSResponse = (props) => {
  const { t } = useTranslation();
  const tenantId = Digit.ULBService.getCurrentTenantId();
  const history = useHistory();
  let filters = func.getQueryStringParams(location.search);
  const [waterApplicationData, setWaterApplicationData] = useState({});
  const [sewerageApplicationData, setSewerageApplicationData] = useState({});


  const { isLoading: waterLoading, isError: waterError, data: waterApplicationDetails } = Digit.Hooks.ws.useWSDetailsPage(t, tenantId, filters?.applicationNumber, "WATER", { enabled: filters?.applicationNumber ? true : false });
  const { isLoading: sewerageLoading, isError: sewerageError, data: sewerageApplicationDetails } = Digit.Hooks.ws.useWSDetailsPage(t, tenantId, filters?.applicationNumber1, "SEWERAGE", { enabled: filters?.applicationNumber1 ? true : false });

  useEffect(async () => {
    setWaterApplicationData(waterApplicationDetails);
    setSewerageApplicationData(sewerageApplicationDetails);
  }, [waterApplicationDetails, sewerageApplicationDetails]);

  const handleWaterDownloadPdf = async () => {
    const tenantInfo = waterApplicationData?.applicationData?.tenantId;
    let res = waterApplicationData?.applicationData;
    const propertDetails = waterApplicationData?.propertyDetails;
    const PDFdata = getPDFData({ ...res }, { ...propertDetails }, tenantInfo, t);
    PDFdata.then((ress) => Digit.Utils.pdf.generate(ress));
  };

  const handleSewerageDownloadPdf = async () => {
    const tenantInfo = sewerageApplicationData?.applicationData?.tenantId;
    let res = sewerageApplicationData?.applicationData;
    const propertDetails = sewerageApplicationData?.propertyDetails;
    const PDFdata = getPDFData({ ...res }, { ...propertDetails }, tenantInfo, t);
    PDFdata.then((ress) => Digit.Utils.pdf.generate(ress));
  };

  const onSubmit = () => {
    history.push(`/digit-ui/employee`);
  }

  return (
    <div>
      <Card>
        <Banner
          message={t("CS_PROPERTY_APPLICATION_SUCCESS")}
          applicationNumber={filters?.applicationNumber}
          applicationNumberOne={filters?.applicationNumber1}
          info={filters?.applicationNumber ? t("WS_WATER_APPLICATION_NUMBER_LABEL") : ""}
          infoOne={filters?.applicationNumber1 ? t("WS_SEWERAGE_APPLICATION_NUMBER_LABEL") : ""}
          successful={true}
          style={{ padding: "10px" }}
          headerStyles={{ fontSize: "32px" }}
          infoOneStyles={{ paddingTop: "20px" }}
        />
        <CardText style={{ paddingBottom: "10px", marginBottom: "10px" }}>{t("WS_MESSAGE_SUB_DESCRIPTION_LABEL")}</CardText>
        <div style={{ display: "flex" }}>
          {filters?.applicationNumber && <div className="primary-label-btn d-grid" style={{ marginLeft: "unset", marginBottom: "10px", padding: "0px 8px" }} onClick={handleWaterDownloadPdf}>
            <svg width="20" height="23" viewBox="0 0 20 23" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19.3334 8H14V0H6.00002V8H0.666687L10 17.3333L19.3334 8ZM0.666687 20V22.6667H19.3334V20H0.666687Z" fill="#F47738" />
            </svg>
            {t("WS_PRINT_WATER_APPLICATION_LABEL")}
          </div>}
          {filters?.applicationNumber1 && <div className="primary-label-btn d-grid" style={{ marginLeft: "unset", marginBottom: "10px", padding: "0px 8px" }} onClick={handleSewerageDownloadPdf}>
            <svg width="20" height="23" viewBox="0 0 20 23" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19.3334 8H14V0H6.00002V8H0.666687L10 17.3333L19.3334 8ZM0.666687 20V22.6667H19.3334V20H0.666687Z" fill="#F47738" />
            </svg>
            {t("WS_PRINT_SEWERAGE_APPLICATION_LABEL")}
          </div>}
        </div>
        <ActionBar style={{ display: "flex", justifyContent: "flex-end", alignItems: "baseline" }}>
          <SubmitBar
            label={t("CORE_COMMON_GO_TO_HOME")}
            onSubmit={onSubmit}
            style={{ margin: "10px 10px 0px 0px" }}
          />
        </ActionBar>
      </Card>
    </div>
  );
};
export default WSResponse;