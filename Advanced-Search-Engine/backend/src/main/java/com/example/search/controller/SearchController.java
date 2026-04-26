package com.example.search.controller;

import com.example.search.model.Product;
import com.example.search.repository.ProductRepository;
import com.example.search.service.SearchService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/search")
@CrossOrigin(origins = "*")
public class SearchController {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private SearchService searchService;

    // Ingestion API: Add a new product to the index
    @PostMapping("/products")
    public Product addProduct(@RequestBody Product product) {
        return productRepository.save(product);
    }

    // Basic Search: Simple match
    @GetMapping("/basic")
    public List<Product> basicSearch(@RequestParam String query) {
        return productRepository.findByNameContaining(query);
    }

    // Advanced Search: Typo tolerant
    @GetMapping("/fuzzy")
    public List<Product> fuzzySearch(@RequestParam String query) {
        return searchService.fuzzySearch(query);
    }

    // Multi-Field Search: Name + Description
    @GetMapping("/multi")
    public List<Product> multiSearch(@RequestParam String query) {
        return searchService.multiMatchSearch(query);
    }
}
