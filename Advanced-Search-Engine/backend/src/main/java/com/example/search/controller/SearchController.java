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
        // Automatically populate the suggest field for autocomplete
        product.setSuggest(new org.springframework.data.elasticsearch.core.suggest.Completion(new String[]{product.getName()}));
        return productRepository.save(product);
    }

    // Autocomplete API
    @GetMapping("/autocomplete")
    public List<String> autocomplete(@RequestParam String query) {
        return searchService.fetchSuggestions(query);
    }

    // Basic Search: Simple match
    @GetMapping("/basic")
    public List<Product> basicSearch(@RequestParam String query) {
        return productRepository.findByNameContaining(query);
    }

    // Advanced Search: Typo tolerant
    @GetMapping("/fuzzy")
    public org.springframework.data.elasticsearch.core.SearchHits<Product> fuzzySearch(@RequestParam String query) {
        return new org.springframework.data.elasticsearch.core.SearchHitsImpl<>(
            0, null, 0, null, 
            searchService.fuzzySearch(query), 
            null, null
        );
    }

    // Multi-Field Search with Facets: Name + Description + Category Counts
    @GetMapping("/multi")
    public org.springframework.data.elasticsearch.core.SearchHits<Product> multiSearch(@RequestParam String query) {
        return searchService.searchWithFacets(query);
    }

    // Geo-Search API
    @GetMapping("/near-me")
    public List<Product> geoSearch(@RequestParam double lat, @RequestParam double lon, @RequestParam String distance) {
        return searchService.geoSearch(lat, lon, distance);
    }
}
