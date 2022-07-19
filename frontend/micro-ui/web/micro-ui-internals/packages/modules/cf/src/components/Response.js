import React from "react";
import { Card, Banner, CardText, SubmitBar } from "@egovernments/digit-ui-react-components";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ResponseComposer } from "@egovernments/digit-ui-react-components";

const BannerPicker = ({ response }) => {

  // Commented for now to handle failure case
  // if (complaints && complaints.response && complaints.response.responseInfo) {
  return (
    <Banner
      message={response.actionMessage}
      complaintNumber={response.complaintNumber}
      successful={true}
    />
  );
  // } else {
  //   return <Banner message={t("CS_COMMON_COMPLAINT_NOT_SUBMITTED")} successful={false} />;
  // }
};

const Response = (props) => {
  const { t } = useTranslation();
  const [successData, setSuccessData, clearSuccessData] = Digit.Hooks.useSessionStorage("CF_RESPONSE", false);
  let resp
  let message = ''
  let response = { actionMessage: '', complaintNumber: '' }
  if (successData.match("Complaint created successfully")) {
    resp = successData.split('\\n')
    message = resp[2]
    response = {
      actionMessage: resp[0].split('"')[1],
      complaintNumber: resp[1].split(': ')[1]
    }
  } else {
    let temp = successData.split('"')
    message = temp[1]
    response.actionMessage = t('CF_FEEDBACK_SUCCESS')
  }

  return (
    <Card>
      <BannerPicker
        response={response}
      />
      <ResponseComposer />
      <CardText>{message}</CardText>
      <Link to="/digit-ui/citizen">
        <SubmitBar label={t("CF_GO_TO_HOME")} />
      </Link>
    </Card>
  );
};

export default Response;