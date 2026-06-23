package com.scacchi.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Configurazione CORS per lo sviluppo locale: consente al frontend Angular
 * (http://localhost:4200) di chiamare direttamente le API anche senza proxy.
 *
 * In sviluppo il percorso primario resta il proxy di Angular (stessa origine,
 * nessuna CORS necessaria); questa configurazione copre le chiamate dirette e
 * il futuro scenario in cui frontend e backend sono serviti separatamente.
 */
@Configuration
public class WebCorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:4200")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*");
    }
}
