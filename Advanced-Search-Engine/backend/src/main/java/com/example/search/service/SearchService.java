package com.example.search.service;

import com.example.search.model.Product;
import co.elastic.clients.elasticsearch._types.aggregations.Aggregation;
import co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.elasticsearch.core.search.Suggester;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.data.elasticsearch.core.query.HighlightQuery;
import org.springframework.data.elasticsearch.core.query.highlight.Highlight;
import org.springframework.data.elasticsearch.core.query.highlight.HighlightField;
import org.springframework.data.elasticsearch.core.query.highlight.HighlightParameters;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class SearchService {

    @Autowired
    private ElasticsearchOperations elasticsearchOperations;

    private Highlight getStandardHighlight() {
        return new Highlight(
                HighlightParameters.builder()
                        .withPreTags("<mark>")
                        .withPostTags("</mark>")
                        .build(),
                List.of(
                        new HighlightField("name"),
                        new HighlightField("description")
                )
        );
    }

    public SearchHits<Product> fuzzySearch(String queryText) {
        Query query = Query.of(q -> q
                .fuzzy(f -> f
                        .field("name")
                        .value(queryText)
                        .fuzziness("AUTO")
                )
        );

        NativeQuery nativeQuery = NativeQuery.builder()
                .withQuery(query)
                .withHighlightQuery(new HighlightQuery(getStandardHighlight(), Product.class))
                .build();

        return elasticsearchOperations.search(nativeQuery, Product.class);
    }

    public SearchHits<Product> searchWithFacets(String queryText) {
        Query query = Query.of(q -> q
                .multiMatch(m -> m
                        .query(queryText)
                        .fields("name^3", "description")
                )
        );

        Aggregation aggregation = Aggregation.of(a -> a
                .terms(t -> t.field("category"))
        );

        NativeQuery nativeQuery = NativeQuery.builder()
                .withQuery(query)
                .withAggregation("categories", aggregation)
                .withHighlightQuery(new HighlightQuery(getStandardHighlight(), Product.class))
                .build();

        return elasticsearchOperations.search(nativeQuery, Product.class);
    }

    public List<String> fetchSuggestions(String queryText) {
        Suggester suggester = Suggester.of(s -> s
                .suggesters("product-suggest", fs -> fs
                        .text(queryText)
                        .completion(c -> c
                                .field("suggest")
                                .skipDuplicates(true)
                                .size(5)
                        )
                )
        );

        NativeQuery nativeQuery = NativeQuery.builder()
                .withSuggester(suggester)
                .build();

        SearchHits<Product> searchHits = elasticsearchOperations.search(nativeQuery, Product.class);

        if (searchHits.getSuggest() != null
                && searchHits.getSuggest().getSuggestion("product-suggest") != null) {
            return searchHits.getSuggest()
                    .getSuggestion("product-suggest")
                    .getEntries().stream()
                    .flatMap(entry -> entry.getOptions().stream())
                    .map(option -> option.getText())
                    .distinct()
                    .collect(Collectors.toList());
        }

        return List.of();
    }

    public List<Product> geoSearch(double lat, double lon, String distance) {
        Query query = Query.of(q -> q
                .bool(b -> b
                        .filter(f -> f
                                .geoDistance(g -> g
                                        .field("location")
                                        .distance(distance)
                                        .location(loc -> loc.latlon(l -> l.lat(lat).lon(lon)))
                                )
                        )
                )
        );

        NativeQuery nativeQuery = NativeQuery.builder()
                .withQuery(query)
                .build();

        SearchHits<Product> searchHits = elasticsearchOperations.search(nativeQuery, Product.class);
        return searchHits.get().map(SearchHit::getContent).collect(Collectors.toList());
    }
}
