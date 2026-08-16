package com.billsplitter.service;

import com.billsplitter.dto.response.TransactionDto;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;

@Service
public class BalanceCalculatorService {

    static class Node implements Comparable<Node> {
        Long userId;
        BigDecimal amount;

        public Node(Long userId, BigDecimal amount) {
            this.userId = userId;
            this.amount = amount;
        }

        @Override
        public int compareTo(Node o) {
            return this.amount.compareTo(o.amount);
        }
    }

    /**
     * Calculates the minimum number of transactions required to settle all debts.
     * @param netBalances Map of user_id to their net balance (positive = owed, negative = owes).
     * @return List of transactions to settle debts.
     */
    public List<TransactionDto> simplifyDebts(Map<Long, BigDecimal> netBalances) {
        List<TransactionDto> transactions = new ArrayList<>();

        // Priority queues for debtors (max-heap for absolute debt amount -> min-heap for actual negative values)
        PriorityQueue<Node> debtors = new PriorityQueue<>();
        // Priority queues for creditors (max-heap for credit amount)
        PriorityQueue<Node> creditors = new PriorityQueue<>((a, b) -> b.amount.compareTo(a.amount));

        for (Map.Entry<Long, BigDecimal> entry : netBalances.entrySet()) {
            BigDecimal balance = entry.getValue().setScale(2, RoundingMode.HALF_UP);
            if (balance.compareTo(BigDecimal.ZERO) < 0) {
                debtors.offer(new Node(entry.getKey(), balance));
            } else if (balance.compareTo(BigDecimal.ZERO) > 0) {
                creditors.offer(new Node(entry.getKey(), balance));
            }
        }

        while (!debtors.isEmpty() && !creditors.isEmpty()) {
            Node debtor = debtors.poll();
            Node creditor = creditors.poll();

            BigDecimal debtAmount = debtor.amount.abs();
            BigDecimal creditAmount = creditor.amount;

            BigDecimal minAmount = debtAmount.min(creditAmount);

            transactions.add(new TransactionDto(debtor.userId, creditor.userId, minAmount));

            debtor.amount = debtor.amount.add(minAmount);
            creditor.amount = creditor.amount.subtract(minAmount);

            if (debtor.amount.compareTo(BigDecimal.ZERO) < 0) {
                debtors.offer(debtor);
            }
            if (creditor.amount.compareTo(BigDecimal.ZERO) > 0) {
                creditors.offer(creditor);
            }
        }

        return transactions;
    }
}
