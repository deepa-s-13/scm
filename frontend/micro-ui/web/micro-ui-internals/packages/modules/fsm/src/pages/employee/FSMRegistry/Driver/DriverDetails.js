import React, { Fragment, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Card,
  StatusTable,
  Row,
  SubmitBar,
  Loader,
  CardSectionHeader,
  ActionBar,
  Menu,
  Toast,
  Header,
  EditIcon,
  DeleteIcon,
  Modal,
  Close,
  CardText,
  Dropdown,
  AddIcon,
} from "@egovernments/digit-ui-react-components";

import { useQueryClient } from "react-query";

import { useHistory, useParams } from "react-router-dom";

const Heading = (props) => {
  return <h1 className="heading-m">{props.label}</h1>;
};

const CloseBtn = (props) => {
  return (
    <div className="icon-bg-secondary" onClick={props.onClick}>
      <Close />
    </div>
  );
};

const DriverDetails = (props) => {
  const tenantId = Digit.ULBService.getCurrentTenantId();
  const state = Digit.ULBService.getStateId();
  const { t } = useTranslation();
  const history = useHistory();
  const queryClient = useQueryClient();
  let { id: dsoId } = useParams();
  const [displayMenu, setDisplayMenu] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [config, setCurrentConfig] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(null);
  const [vendors, setVendors] = useState([]);

  const [selectedOption, setSelectedOption] = useState({});

  const { data: driverData, isLoading: isLoading, isSuccess: isDsoSuccess, error: dsoError } = Digit.Hooks.fsm.useDriverDetails(
    tenantId,
    { ids: dsoId },
    { staleTime: Infinity }
  );

  const { data: vendorData, isLoading: isVendorLoading, isSuccess: isVendorSuccess, error: vendorError } = Digit.Hooks.fsm.useDsoSearch(
    tenantId,
    { status: "ACTIVE" },
    {}
  );

  const {
    isLoading: isDriverLoading,
    isError: isDriverUpdateError,
    data: driverUpdateResponse,
    error: driverupdateError,
    mutate: mutateDriver,
  } = Digit.Hooks.fsm.useDriverUpdate(tenantId);

  const {
    isLoading: isVendorUpdateLoading,
    isError: isVendorUpdateError,
    data: vendorUpdateResponse,
    error: vendorUpdateError,
    mutate: mutateVendor,
  } = Digit.Hooks.fsm.useVendorUpdate(tenantId);

  function onActionSelect(action) {
    setSelectedAction(action);
    setDisplayMenu(false);
  }
  useEffect(() => {
    if (vendorData) {
      let vendors = vendorData.map((data) => data.dsoDetails);
      setVendors(vendors);
    }
  }, [vendorData]);

  useEffect(() => {
    switch (selectedAction) {
      case "DELETE":
      case "ADD_VENDOR":
      case "EDIT_VENDOR":
      case "DELETE_VENDOR":
        return setShowModal(true);
      case "EDIT":
        return history.push("/digit-ui/employee/fsm/registry/modify-driver/" + dsoId);
      default:
        break;
    }
  }, [selectedAction]);

  const closeToast = () => {
    setShowToast(null);
  };

  const handleModalAction = () => {
    switch (selectedAction) {
      case "DELETE":
        return handleDeleteDriver();
      case "DELETE_VENDOR":
        return handleDeleteVendor();
      case "ADD_VENDOR":
        return handleAddVendor();
      case "EDIT_VENDOR":
        return handleEditVendor();
      default:
        break;
    }
  };

  const handleDeleteDriver = () => {
    let driverDetails = driverData?.[0]?.driverData;
    const formData = {
      driver: {
        ...driverDetails,
        status: "INACTIVE",
      },
    };

    mutateDriver(formData, {
      onError: (error, variables) => {
        setShowToast({ key: "error", action: error });
        setTimeout(closeToast, 5000);
      },
      onSuccess: (data, variables) => {
        setShowToast({ key: "success", action: "DELETE_DRIVER" });
        queryClient.invalidateQueries("DSO_SEARCH");
        setTimeout(() => {
          closeToast, history.push(`/digit-ui/employee/fsm/registry`);
        }, 5000);
      },
    });
    setShowModal(false);
  };

  const handleDeleteVendor = () => {
    let formData = {};
    let dsoDetails = driverData?.[0]?.vendorDetails?.vendor?.[0];
    let getDriverVendorDetails = dsoDetails?.drivers;

    getDriverVendorDetails = getDriverVendorDetails.map((data) => {
      if (data.id === dsoId) {
        data.vendorDriverStatus = "INACTIVE";
      }
      return data;
    });

    formData = {
      vendor: {
        ...dsoDetails,
        drivers: getDriverVendorDetails,
      },
    };

    mutateVendor(formData, {
      onError: (error, variables) => {
        setShowToast({ key: "error", action: error });
        setTimeout(closeToast, 5000);
      },
      onSuccess: (data, variables) => {
        setShowToast({ key: "success", action: "DELETE_VENDOR" });
        window.location.reload(false);
        queryClient.invalidateQueries("FSM_VENDOR_SEARCH");
        setTimeout(() => {
          closeToast;
        }, 5000);
      },
    });
    setShowModal(false);
  };

  const handleAddVendor = () => {
    let dsoDetails = selectedOption;
    let driverDetails = driverData?.[0]?.driverData;
    driverDetails.vendorDriverStatus = "ACTIVE";
    const formData = {
      vendor: {
        ...dsoDetails,
        drivers: dsoDetails.drivers ? [...dsoDetails.drivers, driverDetails] : [driverDetails],
      },
    };
    mutateVendor(formData, {
      onError: (error, variables) => {
        setShowToast({ key: "error", action: error });
        setTimeout(closeToast, 5000);
      },
      onSuccess: (data, variables) => {
        setShowToast({ key: "success", action: "ADD_VENDOR" });
        queryClient.invalidateQueries("DSO_SEARCH");
        setTimeout(() => {
          closeToast;
        }, 3000);
      },
    });
    setShowModal(false);
  };

  const handleEditVendor = () => {
    let dsoDetails = selectedOption;
    let driverDetails = driverData?.[0]?.driverData;
    driverDetails.vendorDriverStatus = "ACTIVE";

    const formData = {
      vendor: {
        ...dsoDetails,
        drivers: dsoDetails.drivers ? [...dsoDetails.drivers, driverDetails] : [driverDetails],
      },
    };

    mutateVendor(formData, {
      onError: (error, variables) => {
        setShowToast({ key: "error", action: error });
        setTimeout(closeToast, 5000);
      },
      onSuccess: (data, variables) => {
        setShowToast({ key: "success", action: "EDIT_VENDOR" });
        queryClient.invalidateQueries("DSO_SEARCH");
        setTimeout(closeToast, 5000);
      },
    });
    setShowModal(false);
  };

  const closeModal = () => {
    setSelectedAction(null);
    setShowModal(false);
  };

  const modalHeading = () => {
    switch (selectedAction) {
      case "DELETE":
      case "DELETE_VENDOR":
        return "ES_FSM_REGISTRY_DELETE_POPUP_HEADER";
      case "ADD_VENDOR":
        return "ES_FSM_REGISTRY_ADD_VENDOR_POPUP_HEADER";
      case "EDIT_VENDOR":
        return "ES_FSM_REGISTRY_ADD_VENDOR_POPUP_HEADER";
      default:
        break;
    }
  };

  const renderModalContent = () => {
    if (selectedAction === "DELETE" || selectedAction === "DELETE_VENDOR") {
      return <CardText>{t(`ES_FSM_REGISTRY_DELETE_TEXT`)}</CardText>;
    }
    if (selectedAction === "ADD_VENDOR") {
      return (
        <>
          <CardText>{t(`ES_FSM_REGISTRY_SELECT_VENODOR`)}</CardText>
          <Dropdown t={t} option={vendors} value={selectedOption} selected={selectedOption} select={setSelectedOption} optionKey={"name"} />
        </>
      );
    }
    if (selectedAction === "EDIT_VENDOR") {
      return (
        <>
          <CardText>{t(`ES_FSM_REGISTRY_SELECT_VENODOR`)}</CardText>
          <Dropdown t={t} option={vendors} value={selectedOption} selected={selectedOption} select={setSelectedOption} optionKey={"name"} />
        </>
      );
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <React.Fragment>
      {!isLoading ? (
        <React.Fragment>
          <Header style={{ marginBottom: "16px" }}>{t("ES_FSM_REGISTRY_DRIVER_DETAILS")}</Header>
          <Card style={{ position: "relative" }}>
            {driverData?.[0]?.employeeResponse?.map((detail, index) => (
              <React.Fragment key={index}>
                <CardSectionHeader style={{ marginBottom: "16px", marginTop: "32px" }}>{t(detail.title)}</CardSectionHeader>
                <StatusTable>
                  {detail?.values?.map((value, index) =>
                    value?.type === "custom" ? (
                      <>
                        <div className={`${index === detail?.values?.length - 1 ? "row last" : "row"} border-none`}>
                          <h2>{t(value.title)}</h2>
                          <div className="value" style={{ color: "#f47738", display: "flex" }}>
                            {t(value.value) || "N/A"}
                            {value.value === "ES_FSM_REGISTRY_DETAILS_ADD_VENDOR" && (
                              <span onClick={() => onActionSelect("ADD_VENDOR")}>
                                <AddIcon className="" fill="#f47738" styles={{ cursor: "pointer", marginLeft: "20px", height: "24px" }} />
                              </span>
                            )}
                            {value.value != "ES_FSM_REGISTRY_DETAILS_ADD_VENDOR" && (
                              <span onClick={() => onActionSelect("EDIT_VENDOR")}>
                                <EditIcon style={{ cursor: "pointer", marginLeft: "20px" }} />
                              </span>
                            )}
                            {value.value != "ES_FSM_REGISTRY_DETAILS_ADD_VENDOR" && (
                              <span onClick={() => onActionSelect("DELETE_VENDOR")}>
                                <DeleteIcon className="delete" fill="#f47738" style={{ cursor: "pointer", marginLeft: "20px" }} />
                              </span>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <Row
                        key={t(value.title)}
                        label={t(value.title)}
                        text={t(value.value) || "N/A"}
                        last={index === detail?.values?.length - 1}
                        caption={value.caption}
                        className="border-none"
                      />
                    )
                  )}
                </StatusTable>
              </React.Fragment>
            ))}
          </Card>
          {showModal && (
            <Modal
              headerBarMain={<Heading label={t(modalHeading())} />}
              headerBarEnd={<CloseBtn onClick={closeModal} />}
              actionCancelLabel={t("CS_COMMON_CANCEL")}
              actionCancelOnSubmit={closeModal}
              actionSaveLabel={t(selectedAction === "DELETE" || selectedAction === "DELETE_VENDOR" ? "ES_EVENT_DELETE" : "CS_COMMON_SUBMIT")}
              actionSaveOnSubmit={handleModalAction}
            >
              <Card style={{ boxShadow: "none" }}>{renderModalContent()}</Card>
            </Modal>
          )}
          {showToast && (
            <Toast
              error={showToast.key === "error" ? true : false}
              label={t(showToast.key === "success" ? `ES_FSM_REGISTRY_${showToast.action}_SUCCESS` : showToast.action)}
              onClose={closeToast}
            />
          )}
          <ActionBar style={{ zIndex: "19" }}>
            {displayMenu ? <Menu localeKeyPrefix={"ES_FSM_REGISTRY_ACTION"} options={["EDIT", "DELETE"]} t={t} onSelect={onActionSelect} /> : null}
            <SubmitBar label={t("ES_COMMON_TAKE_ACTION")} onSubmit={() => setDisplayMenu(!displayMenu)} />
          </ActionBar>
        </React.Fragment>
      ) : (
        <Loader />
      )}
    </React.Fragment>
  );
};

export default DriverDetails;