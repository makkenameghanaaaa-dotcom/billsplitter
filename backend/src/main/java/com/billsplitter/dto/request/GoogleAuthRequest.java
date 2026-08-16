package com.billsplitter.dto.request;

import lombok.Data;

@Data
public class GoogleAuthRequest {
    private String credential; // The Google JWT ID Token
}
