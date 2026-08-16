package com.billsplitter.service;

import com.billsplitter.dto.response.TransactionDto;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BalanceCalculatorServiceTest {

    private final BalanceCalculatorService balanceCalculatorService = new BalanceCalculatorService();

    @Test
    void testSimpleTwoPersonDebt() {
        Map<Long, BigDecimal> balances = new HashMap<>();
        balances.put(1L, new BigDecimal("-50.00")); // User 1 owes 50
        balances.put(2L, new BigDecimal("50.00"));  // User 2 is owed 50

        List<TransactionDto> transactions = balanceCalculatorService.simplifyDebts(balances);

        assertEquals(1, transactions.size());
        assertEquals(1L, transactions.get(0).getFromUserId());
        assertEquals(2L, transactions.get(0).getToUserId());
        assertEquals(new BigDecimal("50.00"), transactions.get(0).getAmount());
    }

    @Test
    void testCircularDebt() {
        // User 1 owes User 2 $50 (User 1 = -50, User 2 = +50)
        // User 2 owes User 3 $50 (User 2 = 50 - 50 = 0, User 3 = +50)
        // Expected: User 1 owes User 3 $50.
        Map<Long, BigDecimal> balances = new HashMap<>();
        balances.put(1L, new BigDecimal("-50.00"));
        balances.put(2L, new BigDecimal("0.00"));
        balances.put(3L, new BigDecimal("50.00"));

        List<TransactionDto> transactions = balanceCalculatorService.simplifyDebts(balances);

        assertEquals(1, transactions.size());
        assertEquals(1L, transactions.get(0).getFromUserId());
        assertEquals(3L, transactions.get(0).getToUserId());
        assertEquals(new BigDecimal("50.00"), transactions.get(0).getAmount());
    }

    @Test
    void testAlreadySettled() {
        // Everyone has 0 balance
        Map<Long, BigDecimal> balances = new HashMap<>();
        balances.put(1L, new BigDecimal("0.00"));
        balances.put(2L, new BigDecimal("0.00"));
        balances.put(3L, new BigDecimal("0.00"));

        List<TransactionDto> transactions = balanceCalculatorService.simplifyDebts(balances);

        assertTrue(transactions.isEmpty());
    }

    @Test
    void testComplexScenario() {
        // A (-100), B (+50), C (+50)
        Map<Long, BigDecimal> balances = new HashMap<>();
        balances.put(1L, new BigDecimal("-100.00"));
        balances.put(2L, new BigDecimal("50.00"));
        balances.put(3L, new BigDecimal("50.00"));

        List<TransactionDto> transactions = balanceCalculatorService.simplifyDebts(balances);

        assertEquals(2, transactions.size());
        // Both transactions should be from User 1 (A)
        assertTrue(transactions.stream().allMatch(t -> t.getFromUserId().equals(1L)));
        BigDecimal totalAmount = transactions.stream()
                                             .map(TransactionDto::getAmount)
                                             .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertEquals(new BigDecimal("100.00"), totalAmount);
    }
}
