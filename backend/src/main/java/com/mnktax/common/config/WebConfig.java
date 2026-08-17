package com.mnktax.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.mnktax.common.web.RateLimitInterceptor;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final boolean rateLimitEnabled;
    private final int requestsPerMinute;

    public WebConfig(@Value("${mnk-tax.rate-limit.enabled:true}") boolean rateLimitEnabled,
                     @Value("${mnk-tax.rate-limit.requests-per-minute:120}") int requestsPerMinute) {
        this.rateLimitEnabled = rateLimitEnabled;
        this.requestsPerMinute = requestsPerMinute;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        if (rateLimitEnabled) {
            registry.addInterceptor(new RateLimitInterceptor(requestsPerMinute))
                    .addPathPatterns("/api/**");
        }
    }
}
