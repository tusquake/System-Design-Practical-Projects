package com.ffplatform.dataplane.evaluator;

import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class RuleEvaluator {

    public boolean evaluateRule(String attributeName, String operator, String attributeValue, Map<String, String> context) {
        String userValue = context.get(attributeName);
        if (userValue == null) return false;

        return switch (operator.toUpperCase()) {
            case "EQUALS" -> userValue.equals(attributeValue);
            case "CONTAINS" -> userValue.contains(attributeValue);
            case "IN" -> isValueInList(userValue, attributeValue);
            case "NOT_EQUALS" -> !userValue.equals(attributeValue);
            default -> false;
        };
    }

    private boolean isValueInList(String value, String commaSeparatedList) {
        String[] items = commaSeparatedList.split(",");
        for (String item : items) {
            if (item.trim().equals(value)) return true;
        }
        return false;
    }
}
