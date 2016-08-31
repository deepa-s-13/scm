/*
 * eGov suite of products aim to improve the internal efficiency,transparency,
 *    accountability and the service delivery of the government  organizations.
 *
 *     Copyright (C) <2015>  eGovernments Foundation
 *
 *     The updated version of eGov suite of products as by eGovernments Foundation
 *     is available at http://www.egovernments.org
 *
 *     This program is free software: you can redistribute it and/or modify
 *     it under the terms of the GNU General Public License as published by
 *     the Free Software Foundation, either version 3 of the License, or
 *     any later version.
 *
 *     This program is distributed in the hope that it will be useful,
 *     but WITHOUT ANY WARRANTY; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *     GNU General Public License for more details.
 *
 *     You should have received a copy of the GNU General Public License
 *     along with this program. If not, see http://www.gnu.org/licenses/ or
 *     http://www.gnu.org/licenses/gpl.html .
 *
 *     In addition to the terms of the GPL license to be adhered to in using this
 *     program, the following additional terms are to be complied with:
 *
 *         1) All versions of this program, verbatim or modified must carry this
 *            Legal Notice.
 *
 *         2) Any misrepresentation of the origin of the material is prohibited. It
 *            is required that all modified versions of this material be marked in
 *            reasonable ways as different from the original version.
 *
 *         3) This license does not grant any rights to any user of the program
 *            with regards to rights under trademark law for use of the trade names
 *            or trademarks of eGovernments Foundation.
 *
 *   In case of any queries, you can reach eGovernments Foundation at contact@egovernments.org.
 */

package org.egov.infra.config.properties.messages;

import org.egov.infra.config.properties.ApplicationProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.ReloadableResourceBundleMessageSource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.core.io.support.ResourcePatternResolver;

import java.io.IOException;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.List;

import static org.apache.commons.lang.StringUtils.EMPTY;
import static org.egov.infra.utils.StringUtils.listToStringArray;

@Configuration
public class MessageSourceProperties {

    private static final Logger LOG = LoggerFactory.getLogger(MessageSourceProperties.class);

	@Autowired
	private ApplicationProperties applicationConfigProperties;

	private ResourcePatternResolver resourcePatternResolver = new PathMatchingResourcePatternResolver();

	@Bean
	public ReloadableResourceBundleMessageSource parentMessageSource() {
		final ReloadableResourceBundleMessageSource resource = new ReloadableResourceBundleMessageSource();
		resource.setBasenames(processResourceWithPattern(applicationConfigProperties.commonMessageFiles()));
        resource.setDefaultEncoding(Charset.defaultCharset().name());
		if (applicationConfigProperties.devMode()) {
			resource.setCacheSeconds(0);
			resource.setUseCodeAsDefaultMessage(true);
		}
		return resource;
	}

	private String [] processResourceWithPattern(String ... baseNames) {
		List<String> resources = new ArrayList<>();
		for (String baseName : baseNames) {
			if (baseName.contains("*")) {
                try {
                    Resource[] relResources = resourcePatternResolver.getResources("classpath*:"+baseName);
                    for (Resource relResource : relResources) {
                        resources.add("messages/"+relResource.getFilename().replace(".properties", EMPTY));
                    }
                } catch (IOException e) {
                    LOG.warn("Could not load property file : {}", baseName);
                }
            } else {
				resources.add(baseName);
			}
		}
		return listToStringArray(resources);
	}
}
