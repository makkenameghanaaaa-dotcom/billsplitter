package com.billsplitter.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class GroupRequest {
    @NotBlank
    private String name;
    
    @NotBlank
    @Size(min = 3, max = 3)
    private String baseCurrency;
}
