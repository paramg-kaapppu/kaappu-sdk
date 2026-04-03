package com.kaappu.spring;

import com.kaappu.spring.security.JwksJwtFilter;
import com.kaappu.spring.security.PermissionInterceptor;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.core.Ordered;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@AutoConfiguration
@EnableConfigurationProperties(KaappuProperties.class)
@ConditionalOnProperty(prefix = "kaappu", name = "enabled", havingValue = "true", matchIfMissing = true)
public class KaappuAutoConfiguration implements WebMvcConfigurer {

    private final KaappuProperties properties;

    public KaappuAutoConfiguration(KaappuProperties properties) {
        this.properties = properties;
    }

    @Bean
    public JwksJwtFilter jwksJwtFilter() {
        return new JwksJwtFilter(properties);
    }

    @Bean
    public FilterRegistrationBean<JwksJwtFilter> jwksJwtFilterRegistration(JwksJwtFilter filter) {
        FilterRegistrationBean<JwksJwtFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE + 10);
        registration.addUrlPatterns("/*");
        return registration;
    }

    @Bean
    public PermissionInterceptor permissionInterceptor() {
        return new PermissionInterceptor();
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(permissionInterceptor());
    }
}
