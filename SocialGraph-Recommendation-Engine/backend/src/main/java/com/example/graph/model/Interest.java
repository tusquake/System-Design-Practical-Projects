package com.example.graph.model;

import lombok.Data;
import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;

@Node
@Data
public class Interest {

    @Id
    private String name;

    public Interest() {}
    
    public Interest(String name) {
        this.name = name;
    }
}
