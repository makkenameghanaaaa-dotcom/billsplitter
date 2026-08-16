package com.billsplitter.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "exchange_rates", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"base_currency", "target_currency", "fetched_date"})
})
@Data
@NoArgsConstructor
public class ExchangeRate {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "base_currency", nullable = false, length = 3)
    private String baseCurrency;

    @Column(name = "target_currency", nullable = false, length = 3)
    private String targetCurrency;

    @Column(nullable = false, precision = 12, scale = 6)
    private BigDecimal rate;

    @Column(name = "fetched_date", nullable = false)
    private LocalDate fetchedDate = LocalDate.now();

    @Column(name = "fetched_at", nullable = false, updatable = false)
    private LocalDateTime fetchedAt = LocalDateTime.now();
}
