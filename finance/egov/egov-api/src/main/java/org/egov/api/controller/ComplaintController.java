/**
 * eGov suite of products aim to improve the internal efficiency,transparency,
   accountability and the service delivery of the government  organizations.

    Copyright (C) <2015>  eGovernments Foundation

    The updated version of eGov suite of products as by eGovernments Foundation
    is available at http://www.egovernments.org

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program. If not, see http://www.gnu.org/licenses/ or
    http://www.gnu.org/licenses/gpl.html .

    In addition to the terms of the GPL license to be adhered to in using this
    program, the following additional terms are to be complied with:

        1) All versions of this program, verbatim or modified must carry this
           Legal Notice.

        2) Any misrepresentation of the origin of the material is prohibited. It
           is required that all modified versions of this material be marked in
           reasonable ways as different from the original version.

        3) This license does not grant any rights to any user of the program
           with regards to rights under trademark law for use of the trade names
           or trademarks of eGovernments Foundation.

  In case of any queries, you can reach eGovernments Foundation at contact@egovernments.org.
 */
package org.egov.api.controller;

import static java.util.Arrays.asList;
import static org.springframework.web.bind.annotation.RequestMethod.GET;

import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.io.FileUtils;
import org.apache.commons.io.IOUtils;
import org.egov.api.adapter.ComplaintAdapter;
import org.egov.api.adapter.ComplaintStatusAdapter;
import org.egov.api.adapter.ComplaintTypeAdapter;
import org.egov.api.adapter.TestAdapter;
import org.egov.api.controller.core.ApiController;
import org.egov.api.controller.core.ApiUrl;
import org.egov.api.model.ComplaintSearchRequest;
import org.egov.commons.service.CommonsService;
import org.egov.config.search.Index;
import org.egov.config.search.IndexType;
import org.egov.infra.admin.master.entity.Boundary;
import org.egov.infra.admin.master.service.BoundaryService;
import org.egov.infra.config.security.authentication.SecureUser;
import org.egov.infra.filestore.entity.FileStoreMapper;
import org.egov.pgr.entity.Complaint;
import org.egov.pgr.entity.ComplaintStatus;
import org.egov.pgr.entity.ComplaintType;
import org.egov.pgr.service.ComplaintService;
import org.egov.pgr.service.ComplaintStatusService;
import org.egov.pgr.service.ComplaintTypeService;
import org.egov.pgr.service.ReceivingCenterService;
import org.egov.pgr.utils.constants.PGRConstants;
import org.egov.search.domain.Page;
import org.egov.search.domain.SearchResult;
import org.egov.search.domain.Sort;
import org.egov.search.service.SearchService;
import org.json.simple.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.provider.OAuth2Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

@org.springframework.web.bind.annotation.RestController
@RequestMapping("/v1.0")
public class ComplaintController extends ApiController {

	@Autowired
	protected ComplaintStatusService complaintStatusService;

	@Autowired
	private SearchService searchService;

	@Autowired
	private ReceivingCenterService receivingCenterService;

	@Autowired
	private BoundaryService boundaryService;

	@Autowired
	private CommonsService commonsService;

	@Autowired(required = true)
	protected ComplaintService complaintService;

	@Autowired
	protected ComplaintTypeService complaintTypeService;


	// --------------------------------------------------------------------------------//
	/**
	 * 
	 * @return
	 */
	@RequestMapping(value = { ApiUrl.COMPLAINT_GET_TYPES }, method = GET, produces = { MediaType.TEXT_PLAIN_VALUE })
	public ResponseEntity<String> getAllTypes() {
		try {
			final List<ComplaintType> complaintTypes = complaintTypeService
					.findAll();
			return getResponseHandler().setDataAdapter(
					new ComplaintTypeAdapter()).success(complaintTypes);
		} catch (final Exception e) {
			return getResponseHandler().error(e.getMessage());
		}
	}

	// --------------------------------------------------------------------------------//
	/**
	 * 
	 * @return
	 */
	@RequestMapping(value = { ApiUrl.COMPLAINT_GET_FREQUENTLY_FILED_TYPES }, method = GET, produces = { MediaType.TEXT_PLAIN_VALUE })
	public ResponseEntity<String> getFrequentTypes() {
		try {
			final List<ComplaintType> complaintTypes = complaintTypeService
					.getFrequentlyFiledComplaints();
			return getResponseHandler().setDataAdapter(
					new ComplaintTypeAdapter()).success(complaintTypes);
		} catch (final Exception e) {
			return getResponseHandler().error(e.getMessage());
		}
	}

	// --------------------------------------------------------------------------------//
	/**
	 * 
	 * @param searchRequest
	 * @return
	 */
	@RequestMapping(value = { ApiUrl.COMPLAINT_SEARCH }, method = RequestMethod.POST, produces = MediaType.TEXT_PLAIN_VALUE)
	public ResponseEntity<String> complaintSearch(
			@RequestBody final ComplaintSearchRequest searchRequest) {
		final SearchResult searchResult = searchService.search(
				asList(Index.PGR.toString()),
				asList(IndexType.COMPLAINT.toString()),
				searchRequest.searchQuery(), searchRequest.searchFilters(),
				Sort.NULL, Page.NULL);
		return getResponseHandler().success(searchResult.getDocuments());
	}

	// --------------------------------------------------------------------------------//
	/**
	 * 
	 * @param complaint
	 * @return
	 */
	@RequestMapping(value = ApiUrl.COMPLAINT_CREATE, method = RequestMethod.POST)
	public ResponseEntity<String> complaintCreate(
			@RequestBody JSONObject complaintRequest) {

		try {
			Complaint complaint = new Complaint();
			long complaintTypeId = (int) complaintRequest
					.get("complaintTypeId");
			if (complaintRequest.get("locationId") != null
					&& (int) complaintRequest.get("locationId") > 0) {
				long locationId = (int) complaintRequest.get("locationId");
				Boundary loc = boundaryService.getBoundaryById(locationId);
				if (loc != null) {
					complaint.setLocation(loc);
				}
			}
			if (complaintRequest.get("lng") != null
					&& (double) complaintRequest.get("lng") > 0) {
				double lng = (double) complaintRequest.get("lng");
				complaint.setLng(lng);
			}
			if (complaintRequest.get("lat") != null
					&& (double) complaintRequest.get("lat") > 0) {
				double lat = (double) complaintRequest.get("lat");
				complaint.setLat(lat);
			}
			if (complaint.getLocation() == null
					&& (complaint.getLat() == 0 || complaint.getLng() == 0)) {
				return getResponseHandler().error(this.getMessage("location.required"));
			}

			complaint.setDetails(complaintRequest.get("details").toString());
			complaint.setLandmarkDetails(complaintRequest
					.get("landmarkDetails").toString());

			if (complaintTypeId > 0) {
				ComplaintType complaintType = complaintTypeService
						.findBy(complaintTypeId);
				complaintType.setLocationRequired(true);
				complaint.setComplaintType(complaintType);
			}

			complaintService.createComplaint(complaint);

			return getResponseHandler().setDataAdapter(new ComplaintAdapter())
					.success(complaint,
							this.getMessage("msg.complaint.reg.success"));

		} catch (final Exception e) {
			return getResponseHandler().error(e.getMessage());
		}
	}

	// --------------------------------------------------------------------------------//
	/**
	 * 
	 * @param complaintNo
	 * @param files
	 * @return
	 */
	@RequestMapping(value = { ApiUrl.COMPLAINT_UPLOAD_SUPPORT_DOCUMENT }, method = RequestMethod.POST)
	public ResponseEntity<String> uploadSupportDocs(
			@PathVariable String complaintNo,
			@RequestParam("files") MultipartFile file) {

		String msg = "";
		try {
			Complaint complaint = complaintService
					.getComplaintByCRN(complaintNo);

			FileStoreMapper uploadFile = fileStoreService.store(
					file.getInputStream(), file.getOriginalFilename(),
					file.getContentType(), PGRConstants.MODULE_NAME);
			complaint.getSupportDocs().add(uploadFile);
			complaintService.update(complaint, null, null);

			return getResponseHandler().success("", this.getMessage("msg.complaint.update.success"));
		} catch (Exception e) {
			msg = e.getMessage();
		}

		return getResponseHandler().error(msg);
	}

	// --------------------------------------------------------------------------------//
	/**
	 * @param complaintNo
	 * @return
	 */
	@RequestMapping(value = { ApiUrl.COMPLAINT_DETAIL }, method = RequestMethod.GET, produces = MediaType.TEXT_PLAIN_VALUE)
	public ResponseEntity<String> getDetail(
			@PathVariable final String complaintNo) {

		if (complaintNo == null) {
			return getResponseHandler().error("Invalid number");
		}
		Complaint complaint = complaintService.getComplaintByCRN(complaintNo);
		if (complaint == null) {
			return getResponseHandler().error("no complaint information");
		}
		return getResponseHandler().setDataAdapter(new ComplaintAdapter())
				.success(complaint);

	}

	// --------------------------------------------------------------------------------//
	/**
	 * @param complaintNo
	 * @return
	 */
	@RequestMapping(value = { ApiUrl.COMPLAINT_STATUS }, method = RequestMethod.GET, produces = MediaType.TEXT_PLAIN_VALUE)
	public ResponseEntity<String> getStatus(
			@PathVariable final String complaintNo) {

		if (complaintNo == null) {
			return getResponseHandler().error("Invalid number");
		}
		Complaint complaint = complaintService.getComplaintByCRN(complaintNo);
		if (complaint == null) {
			return getResponseHandler().error("no complaint information");
		} else {

			return getResponseHandler().setDataAdapter(
					new ComplaintStatusAdapter()).success(
					complaint.getStateHistory());
		}
	}

	// --------------------------------------------------------------------------------//
	/**
	 * @param page
	 * @param pageSize
	 * @return
	 */

	@RequestMapping(value = { ApiUrl.COMPLAINT_LATEST }, method = RequestMethod.GET, produces = MediaType.TEXT_PLAIN_VALUE)
	public ResponseEntity<String> getLatest(@PathVariable("page") int page,
			@PathVariable("pageSize") int pageSize) {

		if (page < 1) {
			return getResponseHandler().error("Invalid Page Number");
		}
		try {
			List<Complaint> list = entityManager
					.createQuery("from Complaint order by createddate DESC",
							Complaint.class)
					.setFirstResult((page - 1) * pageSize)
					.setMaxResults(pageSize + 1).getResultList();

			boolean hasNextPage = false;
			if (list.size() > pageSize) {
				hasNextPage = true;
				list.remove(pageSize);
			}
			return getResponseHandler()
					.putStatusAttribute("hasNextPage",
							String.valueOf(hasNextPage))
					.setDataAdapter(new ComplaintAdapter()).success(list);
		} catch (final Exception e) {
			return getResponseHandler().error(e.getMessage());
		}

	}

	// --------------------------------------------------------------------------------//

	/**
	 * 
	 * @param request
	 * @return
	 */
	@RequestMapping(value = { ApiUrl.COMPLAINT_GET_LOCATION }, method = RequestMethod.GET, produces = MediaType.TEXT_PLAIN_VALUE)
	public ResponseEntity<String> getLocation(HttpServletRequest request) {

		String locationName = request.getParameter("locationName");
		if (locationName == null || locationName.isEmpty()
				|| locationName.length() < 3) {
			return getResponseHandler().error(
					getMessage("location.search.invalid"));
		}

		List<Map<String, Object>> list = new ArrayList<Map<String, Object>>();

		boundaryService
				.getBoundaryByNameLike(locationName)
				.stream()
				.forEach(
						location -> {
							Map<String, Object> res = new HashMap<String, Object>();
							res.put("id", location.getId());
							if (location.isRoot())
								res.put("name", location.getName());
							else {
								Boundary currentLocation = location;
								StringBuilder loc = new StringBuilder();
								String delim = "";
								while (!currentLocation.isRoot()) {
									loc.append(delim).append(
											currentLocation.getName());
									delim = ",";
									currentLocation = currentLocation
											.getParent();
									if (currentLocation.isRoot()) {
										loc.append(delim).append(
												currentLocation.getName());
										break;
									}
								}
								res.put("name", loc.toString());
								list.add(res);
							}
						});
		return getResponseHandler().success(list);
	}

	// --------------------------------------------------------------------------------//
	@RequestMapping(value = { ApiUrl.CITIZEN_GET_MY_COMPLAINT }, method = RequestMethod.GET, produces = MediaType.TEXT_PLAIN_VALUE)
	public ResponseEntity<String> getMyComplaint(
			OAuth2Authentication authentication,
			@PathVariable("page") int page,
			@PathVariable("pageSize") int pageSize) {

		SecureUser su = (SecureUser) authentication.getUserAuthentication()
				.getPrincipal();

		if (page < 1) {
			return getResponseHandler().error("Invalid Page Number");
		}
		try {
			List<Complaint> list = entityManager
					.createQuery(
							"from Complaint where createdBy=:createdBy order by createddate DESC",
							Complaint.class)
					.setParameter("createdBy", su.getUser())
					.setFirstResult((page - 1) * pageSize)
					.setMaxResults(pageSize + 1).getResultList();

			boolean hasNextPage = false;
			if (list.size() > pageSize) {
				hasNextPage = true;
				list.remove(pageSize);
			}

			return getResponseHandler()
					.putStatusAttribute("hasNextPage",
							String.valueOf(hasNextPage))
					.setDataAdapter(new ComplaintAdapter()).success(list);
		} catch (final Exception e) {
			return getResponseHandler().error(e.getMessage());
		}

	}

	// --------------------------------------------------------------------------------//
	@SuppressWarnings("unchecked")
	@RequestMapping(value = ApiUrl.COMPLAINT_NEARBY, method = RequestMethod.GET, produces = MediaType.TEXT_PLAIN_VALUE)
	public ResponseEntity<String> getNearByComplaint(
			@PathVariable("page") int page, @RequestParam("lat") float lat,
			@RequestParam("lng") float lng,
			@RequestParam("distance") int distance,
			@PathVariable("pageSize") int pageSize) {

		if (page < 1) {
			return getResponseHandler().error("Invalid Page Number");
		}
		try {
			List<Complaint> list = entityManager
					.createNativeQuery(
							"SELECT * FROM egpgr_complaint WHERE earth_box( ll_to_earth("
									+ lat
									+ ", "
									+ lng
									+ "),"
									+ distance
									+ ") @> ll_to_earth(egpgr_complaint.lat, egpgr_complaint.lng)",
							Complaint.class)
					.setFirstResult((page - 1) * pageSize)
					.setMaxResults(pageSize + 1).getResultList();

			boolean hasNextPage = false;
			if (list.size() > pageSize) {
				hasNextPage = true;
				list.remove(pageSize);
			}

			return getResponseHandler()
					.putStatusAttribute("hasNextPage", String.valueOf(hasNextPage))
					.setDataAdapter(new ComplaintAdapter()).success(list);
		} catch (final Exception e) {
			return getResponseHandler().error(e.getMessage());
		}
	}

	// ------------------------------------------
	@RequestMapping(value = ApiUrl.COMPLAINT_DOWNLOAD_SUPPORT_DOCUMENT, method = RequestMethod.GET)
	public void getComplaintDoc(@PathVariable String complaintNo,
			@RequestParam("fileNo") Long fileNo, HttpServletResponse response)
			throws IOException {

		try {
			Complaint complaint = complaintService
					.getComplaintByCRN(complaintNo);
			Set<FileStoreMapper> files = complaint.getSupportDocs();

			int i = 1;
			Iterator<FileStoreMapper> it = files.iterator();
			File downloadFile = null;
			while (it.hasNext()) {
				FileStoreMapper fm = it.next();
				if (i == fileNo) {
					downloadFile = fileStoreService.fetch(fm.getFileStoreId(),
							PGRConstants.MODULE_NAME);
					response.setHeader("Content-Length",
							String.valueOf(downloadFile.length()));
					response.setHeader("Content-Disposition",
							"attachment;filename=" + fm.getFileName());
					response.setContentType(Files.probeContentType(downloadFile
							.toPath()));
					OutputStream out = response.getOutputStream();
					IOUtils.write(FileUtils.readFileToByteArray(downloadFile),
							out);
					IOUtils.closeQuietly(out);
					break;
				}
				i++;
			}

		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	// ---------------------------------------------------------------------//

	@RequestMapping(value = ApiUrl.COMPLAINT_UPDATE_STATUS, method = RequestMethod.PUT, produces = MediaType.TEXT_PLAIN_VALUE)
	public ResponseEntity<String> updateComplaintStatus(
			@PathVariable String complaintNo, @RequestBody JSONObject jsonData) {

		String msg = null;
		try {
			Complaint complaint = complaintService
					.getComplaintByCRN(complaintNo);
			ComplaintStatus cmpStatus = complaintStatusService
					.getByName(jsonData.get("action").toString());
			complaint.setStatus(cmpStatus);
			complaintService.update(complaint, Long.valueOf(0),
					jsonData.get("comment").toString());

			return getResponseHandler().success("", this.getMessage("msg.complaint.status.update.success"));
		} catch (Exception e) {
			msg = e.getMessage();
		}
		return getResponseHandler().error(msg);

	}

}